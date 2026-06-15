
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
  IF NEW.entregador_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF OLD.entregador_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.endereco_coleta_lat IS NULL OR NEW.endereco_coleta_lng IS NULL
     OR NEW.endereco_entrega_lat IS NULL OR NEW.endereco_entrega_lng IS NULL THEN
    RETURN NEW;
  END IF;

  _km := public.haversine_km(
    NEW.endereco_coleta_lat, NEW.endereco_coleta_lng,
    NEW.endereco_entrega_lat, NEW.endereco_entrega_lng
  );
  _nova_taxa := public.calcular_tarifa_global(_km);

  IF _nova_taxa IS NULL THEN
    RETURN NEW;
  END IF;

  -- Cartão na entrega: dobra a taxa (entregador precisa retornar à loja
  -- para devolver a maquininha).
  IF NEW.forma_pagamento = 'cartao'::public.forma_pagamento THEN
    _nova_taxa := _nova_taxa * 2;
  END IF;

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
  _flag boolean;
  _km numeric;
  _nova_taxa numeric;
  _tem_oferta boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.pedido_ofertas
     WHERE pedido_id = _pedido_id
       AND entregador_id = auth.uid()
       AND status = 'ativo'
       AND expira_em > now()
  ) INTO _tem_oferta;
  IF NOT _tem_oferta THEN
    RAISE EXCEPTION 'Esta oferta não está mais ativa para você';
  END IF;

  SELECT aceita_pedidos_externos INTO _flag FROM public.profiles WHERE id = auth.uid();
  IF NOT COALESCE(_flag, false) THEN
    RAISE EXCEPTION 'Você não está habilitado como entregador externo';
  END IF;

  IF NOT public.is_entregador_aprovado(auth.uid()) THEN
    RAISE EXCEPTION 'Sua conta de entregador ainda não foi aprovada';
  END IF;

  SELECT * INTO _p FROM public.pedidos WHERE id = _pedido_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
  IF _p.entregador_id IS NOT NULL THEN
    RAISE EXCEPTION 'Pedido já foi aceito por outro entregador';
  END IF;
  IF _p.status <> 'pronto'::pedido_status THEN
    RAISE EXCEPTION 'Pedido não está mais disponível';
  END IF;
  IF public.loja_tem_entregador_proprio_online(_p.loja_id) THEN
    RAISE EXCEPTION 'Essa loja agora tem entregador próprio online';
  END IF;

  _km := public.haversine_km(
    _p.endereco_coleta_lat, _p.endereco_coleta_lng,
    _p.endereco_entrega_lat, _p.endereco_entrega_lng
  );
  _nova_taxa := COALESCE(public.calcular_tarifa_global(_km), _p.taxa_entrega);

  -- Cartão na entrega: dobra a taxa (retorno à loja para devolver a maquininha).
  IF _p.forma_pagamento = 'cartao'::public.forma_pagamento THEN
    _nova_taxa := _nova_taxa * 2;
  END IF;

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
    RAISE EXCEPTION 'Pedido não pôde ser aceito (já foi pego)';
  END IF;

  UPDATE public.pedido_ofertas
     SET status = 'aceito'
   WHERE pedido_id = _pedido_id
     AND entregador_id = auth.uid()
     AND status = 'ativo';

  RETURN _p;
END;
$function$;
