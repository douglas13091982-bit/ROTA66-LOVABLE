-- 1) Atualiza o trigger para reconhecer um bypass setado por funções confiáveis
CREATE OR REPLACE FUNCTION public.pedidos_entregador_update_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _bypass text;
BEGIN
  -- Bypass explícito por RPCs SECURITY DEFINER confiáveis (escopo: transação)
  _bypass := current_setting('app.bypass_pedido_guard', true);
  IF _bypass = 'on' THEN
    RETURN NEW;
  END IF;

  IF _uid IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.has_role(_uid, 'super_admin'::public.app_role) THEN
    RETURN NEW;
  END IF;
  IF public.is_loja_owner(_uid, OLD.loja_id) THEN
    RETURN NEW;
  END IF;

  -- A partir daqui o caller é o entregador

  IF NEW.taxa_entrega IS DISTINCT FROM OLD.taxa_entrega
     OR NEW.valor_total IS DISTINCT FROM OLD.valor_total
     OR NEW.valor_produtos IS DISTINCT FROM OLD.valor_produtos
     OR NEW.entrega_paga IS DISTINCT FROM OLD.entrega_paga
     OR NEW.entrega_paga_em IS DISTINCT FROM OLD.entrega_paga_em
     OR NEW.forma_pagamento IS DISTINCT FROM OLD.forma_pagamento
     OR NEW.troco_para IS DISTINCT FROM OLD.troco_para THEN
    RAISE EXCEPTION 'Entregador não pode alterar campos financeiros do pedido';
  END IF;

  IF NEW.cliente_user_id IS DISTINCT FROM OLD.cliente_user_id
     OR NEW.cliente_nome IS DISTINCT FROM OLD.cliente_nome
     OR NEW.cliente_telefone IS DISTINCT FROM OLD.cliente_telefone
     OR NEW.endereco_entrega IS DISTINCT FROM OLD.endereco_entrega
     OR NEW.complemento IS DISTINCT FROM OLD.complemento
     OR NEW.cidade IS DISTINCT FROM OLD.cidade
     OR NEW.endereco_coleta IS DISTINCT FROM OLD.endereco_coleta
     OR NEW.loja_id IS DISTINCT FROM OLD.loja_id
     OR NEW.numero IS DISTINCT FROM OLD.numero
     OR NEW.itens::text IS DISTINCT FROM OLD.itens::text
     OR NEW.arquivado IS DISTINCT FROM OLD.arquivado THEN
    RAISE EXCEPTION 'Entregador não pode alterar dados do cliente ou do pedido';
  END IF;

  IF NEW.codigo_entrega IS DISTINCT FROM OLD.codigo_entrega THEN
    RAISE EXCEPTION 'Entregador não pode alterar código de entrega';
  END IF;
  IF NEW.codigo_coleta IS DISTINCT FROM OLD.codigo_coleta
     AND NOT (OLD.entregador_id IS NULL AND NEW.entregador_id = _uid) THEN
    RAISE EXCEPTION 'Código de coleta só pode ser definido no momento do aceite';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (OLD.status = 'pronto'::pedido_status
            AND NEW.status = 'em_rota'::pedido_status
            AND OLD.entregador_id IS NULL
            AND NEW.entregador_id = _uid) THEN
      RAISE EXCEPTION 'Mudanças de status devem usar confirmar_coleta / confirmar_entrega';
    END IF;
  END IF;

  IF NEW.entregador_id IS DISTINCT FROM OLD.entregador_id THEN
    IF NOT (OLD.entregador_id IS NULL AND NEW.entregador_id = _uid) THEN
      RAISE EXCEPTION 'Entregador não pode reatribuir o pedido';
    END IF;
  END IF;

  IF NEW.coleta_confirmada_em IS DISTINCT FROM OLD.coleta_confirmada_em
     OR NEW.entrega_confirmada_em IS DISTINCT FROM OLD.entrega_confirmada_em THEN
    RAISE EXCEPTION 'Confirmações de coleta/entrega devem ser feitas via RPC';
  END IF;

  RETURN NEW;
END;
$$;

-- 2) confirmar_coleta libera o bypass dentro da transação
CREATE OR REPLACE FUNCTION public.confirmar_coleta(_pedido_id uuid, _codigo text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _p public.pedidos%ROWTYPE;
BEGIN
  SELECT * INTO _p FROM public.pedidos WHERE id = _pedido_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
  IF NOT public.is_loja_owner(auth.uid(), _p.loja_id) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  IF _p.status <> 'em_rota' THEN
    RAISE EXCEPTION 'Pedido não está em rota de coleta';
  END IF;
  IF _p.codigo_coleta IS DISTINCT FROM _codigo THEN
    RAISE EXCEPTION 'Código inválido';
  END IF;
  PERFORM set_config('app.bypass_pedido_guard', 'on', true);
  UPDATE public.pedidos
    SET status = 'coletado', coleta_confirmada_em = now()
    WHERE id = _pedido_id;
  RETURN true;
END;
$function$;

-- 3) confirmar_entrega libera o bypass dentro da transação
CREATE OR REPLACE FUNCTION public.confirmar_entrega(_pedido_id uuid, _codigo text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _p public.pedidos%ROWTYPE;
BEGIN
  SELECT * INTO _p FROM public.pedidos WHERE id = _pedido_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
  IF NOT (
    public.is_loja_owner(auth.uid(), _p.loja_id)
    OR (_p.entregador_id IS NOT NULL AND auth.uid() = _p.entregador_id)
    OR (_p.cliente_user_id IS NOT NULL AND auth.uid() = _p.cliente_user_id)
  ) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  IF _p.status <> 'coletado' THEN
    RAISE EXCEPTION 'Pedido ainda não foi coletado';
  END IF;
  IF _p.codigo_entrega IS DISTINCT FROM _codigo THEN
    RAISE EXCEPTION 'Código inválido';
  END IF;
  PERFORM set_config('app.bypass_pedido_guard', 'on', true);
  UPDATE public.pedidos
    SET status = 'entregue', entrega_confirmada_em = now()
    WHERE id = _pedido_id;
  RETURN true;
END;
$function$;

-- 4) aceitar_pedido_externo libera o bypass dentro da transação
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
BEGIN
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

  RETURN _p;
END;
$function$;