CREATE OR REPLACE FUNCTION public.get_ganho_hoje(_entregador_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(SUM(
    COALESCE(p.taxa_entrega, 0) + COALESCE(p.bonus_entregador, 0)
  ), 0)::numeric
  FROM public.pedidos p
  WHERE p.entregador_id = _entregador_id
    AND p.status = 'entregue'
    AND COALESCE(p.entrega_confirmada_em, p.updated_at)
        >= (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo');
$function$;

CREATE OR REPLACE FUNCTION public.processar_saldos_pedido_entregue()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _taxa_entregador numeric;
BEGIN
  IF NEW.status = 'entregue'::pedido_status
     AND (OLD.status IS DISTINCT FROM NEW.status)
     AND NEW.entregador_id IS NOT NULL THEN

    _taxa_entregador := COALESCE(NEW.taxa_entrega, 0) + COALESCE(NEW.bonus_entregador, 0);
    IF _taxa_entregador <= 0 THEN RETURN NEW; END IF;

    IF EXISTS (
      SELECT 1 FROM public.entregadores_saldo_saque_movimentos
      WHERE pedido_id = NEW.id AND tipo = 'credito_entrega'
    ) THEN
      RETURN NEW;
    END IF;

    PERFORM public.aplicar_movimento_entregador_saque(
      NEW.entregador_id, _taxa_entregador, 'credito_entrega', NEW.id, NULL,
      'Entrega pedido #' || NEW.numero
    );

    PERFORM public.aplicar_movimento_loja_saldo(
      NEW.loja_id, -_taxa_entregador, 'debito_pedido', NEW.id,
      'Taxa de entrega pedido #' || NEW.numero
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.recalcular_taxa_entregador_na_atribuicao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _km numeric;
  _nova_taxa numeric;
BEGIN
  IF NEW.entregador_id IS NULL THEN RETURN NEW; END IF;
  IF OLD.entregador_id IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.endereco_coleta_lat IS NULL OR NEW.endereco_coleta_lng IS NULL
     OR NEW.endereco_entrega_lat IS NULL OR NEW.endereco_entrega_lng IS NULL THEN
    RETURN NEW;
  END IF;

  _km := public.haversine_km(
    NEW.endereco_coleta_lat, NEW.endereco_coleta_lng,
    NEW.endereco_entrega_lat, NEW.endereco_entrega_lng
  );
  _nova_taxa := public.calcular_tarifa_global(_km);
  IF _nova_taxa IS NULL THEN RETURN NEW; END IF;

  NEW.taxa_entrega := _nova_taxa;
  NEW.valor_total := COALESCE(NEW.valor_produtos, 0) + _nova_taxa;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.aceitar_pedido_externo(_pedido_id uuid)
RETURNS pedidos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _p public.pedidos%ROWTYPE;
  _km numeric;
  _nova_taxa numeric;
  _scope text;
  _vinculado boolean;
  _aceita_ext boolean;
  _tipo public.tipo_veiculo;
  _max_paradas integer;
  _ativos integer;
  _km_entrega numeric;
BEGIN
  IF NOT public.is_entregador_aprovado(auth.uid()) THEN
    RAISE EXCEPTION 'Sua conta de entregador ainda não foi aprovada';
  END IF;

  SELECT tipo_veiculo INTO _tipo FROM public.profiles WHERE id = auth.uid();
  SELECT CASE
           WHEN COALESCE(_tipo, 'moto'::public.tipo_veiculo) = 'moto'::public.tipo_veiculo
             THEN COALESCE(max_paradas_por_rota, 5)
           ELSE COALESCE(max_paradas_por_rota_carro, 20)
         END
    INTO _max_paradas
    FROM public.config_roteirizacao LIMIT 1;
  _max_paradas := COALESCE(_max_paradas, CASE WHEN _tipo = 'moto' THEN 5 ELSE 20 END);

  SELECT COUNT(*) INTO _ativos
    FROM public.pedidos
   WHERE entregador_id = auth.uid()
     AND status IN ('em_rota'::pedido_status, 'coletado'::pedido_status);

  IF _ativos >= _max_paradas THEN
    RAISE EXCEPTION 'Limite de % pedidos ativos atingido. Conclua entregas antes de aceitar mais.', _max_paradas;
  END IF;

  SELECT * INTO _p FROM public.pedidos WHERE id = _pedido_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
  IF _p.entregador_id IS NOT NULL THEN
    RAISE EXCEPTION 'Pedido já foi aceito por outro entregador';
  END IF;
  IF _p.status <> 'pronto'::pedido_status THEN
    RAISE EXCEPTION 'Pedido não está mais disponível';
  END IF;

  IF _tipo = 'bike_eletrica'::public.tipo_veiculo THEN
    IF _p.endereco_coleta_lat IS NULL OR _p.endereco_coleta_lng IS NULL
       OR _p.endereco_entrega_lat IS NULL OR _p.endereco_entrega_lng IS NULL THEN
      RAISE EXCEPTION 'Pedido sem coordenadas suficientes para bike elétrica';
    END IF;
    _km_entrega := public.haversine_km(
      _p.endereco_coleta_lat, _p.endereco_coleta_lng,
      _p.endereco_entrega_lat, _p.endereco_entrega_lng
    );
    IF _km_entrega > 4 THEN
      RAISE EXCEPTION 'Distância da entrega (% km) excede o limite de 4 km para bike elétrica', round(_km_entrega::numeric, 2);
    END IF;
  END IF;

  SELECT pool_aberto_scope INTO _scope FROM public.config_roteirizacao LIMIT 1;
  _scope := COALESCE(_scope, 'vinculados_e_externos');

  SELECT EXISTS (
    SELECT 1 FROM public.loja_entregadores le
     WHERE le.loja_id = _p.loja_id
       AND le.entregador_id = auth.uid()
       AND le.ativo = true
  ) INTO _vinculado;

  SELECT COALESCE(pr.aceita_pedidos_externos, false) INTO _aceita_ext
    FROM public.profiles pr WHERE pr.id = auth.uid();

  IF _vinculado AND _scope IN ('somente_vinculados','vinculados_e_externos') THEN
    NULL;
  ELSIF NOT _vinculado
        AND _scope IN ('somente_externos','vinculados_e_externos')
        AND _aceita_ext
        AND NOT public.loja_tem_entregador_proprio_online(_p.loja_id) THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'Este pedido não está disponível para você';
  END IF;

  _km := public.haversine_km(
    _p.endereco_coleta_lat, _p.endereco_coleta_lng,
    _p.endereco_entrega_lat, _p.endereco_entrega_lng
  );
  _nova_taxa := COALESCE(public.calcular_tarifa_global(_km), _p.taxa_entrega);

  PERFORM set_config('app.bypass_pedido_guard', 'on', true);

  UPDATE public.pedidos
     SET entregador_id = auth.uid(),
         status = 'em_rota'::pedido_status,
         taxa_entrega = _nova_taxa,
         valor_total = COALESCE(valor_produtos, 0) + _nova_taxa
   WHERE id = _pedido_id
     AND entregador_id IS NULL
     AND status = 'pronto'::pedido_status
   RETURNING * INTO _p;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido já foi aceito por outro entregador';
  END IF;

  UPDATE public.pedido_ofertas
     SET status = 'aceito'
   WHERE pedido_id = _pedido_id
     AND entregador_id = auth.uid()
     AND status = 'ativo';

  RETURN _p;
END;
$function$;