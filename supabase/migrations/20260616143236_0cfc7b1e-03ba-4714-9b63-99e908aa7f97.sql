
-- 1) Nova coluna de configuração de escopo do pool aberto
ALTER TABLE public.config_roteirizacao
  ADD COLUMN IF NOT EXISTS pool_aberto_scope text NOT NULL DEFAULT 'vinculados_e_externos';

ALTER TABLE public.config_roteirizacao
  DROP CONSTRAINT IF EXISTS config_roteirizacao_pool_aberto_scope_check;

ALTER TABLE public.config_roteirizacao
  ADD CONSTRAINT config_roteirizacao_pool_aberto_scope_check
  CHECK (pool_aberto_scope IN ('somente_vinculados','somente_externos','vinculados_e_externos'));

-- 2) Reescreve pedidos_pool_externo() — pool aberto para todos os entregadores aprovados
DROP FUNCTION IF EXISTS public.pedidos_pool_externo();

CREATE FUNCTION public.pedidos_pool_externo()
RETURNS TABLE(
  id uuid,
  numero integer,
  loja_id uuid,
  cliente_user_id uuid,
  cliente_nome text,
  cliente_telefone text,
  endereco_entrega text,
  cidade text,
  complemento text,
  itens jsonb,
  valor_produtos numeric,
  taxa_entrega numeric,
  valor_total numeric,
  forma_pagamento forma_pagamento,
  troco_para numeric,
  status pedido_status,
  entregador_id uuid,
  observacoes text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  codigo_coleta text,
  codigo_entrega text,
  endereco_coleta text,
  coleta_confirmada_em timestamp with time zone,
  entrega_confirmada_em timestamp with time zone,
  arquivado boolean,
  rota_id uuid,
  rota_ordem integer,
  atribuido_automaticamente boolean,
  endereco_entrega_lat numeric,
  endereco_coleta_lat numeric,
  endereco_entrega_lng numeric,
  endereco_coleta_lng numeric,
  duracao_estimada_seg integer,
  distancia_metros integer,
  eta_chegada_at timestamp with time zone,
  bonus_entregador numeric,
  entrega_paga_em timestamp with time zone,
  entrega_paga boolean,
  oferta_expira_em timestamp with time zone,
  loja_nome text,
  loja_bairro text,
  loja_plano_mensal_ativo boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _scope text;
  _aceita_ext boolean;
BEGIN
  IF NOT public.is_entregador_aprovado(auth.uid()) THEN
    RETURN;
  END IF;

  SELECT pool_aberto_scope INTO _scope
    FROM public.config_roteirizacao LIMIT 1;
  _scope := COALESCE(_scope, 'vinculados_e_externos');

  SELECT COALESCE(aceita_pedidos_externos, false) INTO _aceita_ext
    FROM public.profiles WHERE id = auth.uid();

  RETURN QUERY
  SELECT p.id, p.numero, p.loja_id, p.cliente_user_id, p.cliente_nome, p.cliente_telefone,
         p.endereco_entrega, p.cidade, p.complemento, p.itens, p.valor_produtos, p.taxa_entrega,
         p.valor_total, p.forma_pagamento, p.troco_para, p.status, p.entregador_id, p.observacoes,
         p.created_at, p.updated_at, p.codigo_coleta, p.codigo_entrega, p.endereco_coleta,
         p.coleta_confirmada_em, p.entrega_confirmada_em, p.arquivado, p.rota_id, p.rota_ordem,
         p.atribuido_automaticamente, p.endereco_entrega_lat, p.endereco_coleta_lat,
         p.endereco_entrega_lng, p.endereco_coleta_lng, p.duracao_estimada_seg, p.distancia_metros,
         p.eta_chegada_at, p.bonus_entregador, p.entrega_paga_em, p.entrega_paga,
         NULL::timestamptz AS oferta_expira_em,
         l.nome AS loja_nome,
         l.bairro AS loja_bairro,
         COALESCE(l.plano_mensal_ativo, false) AS loja_plano_mensal_ativo
    FROM public.pedidos p
    JOIN public.lojas l ON l.id = p.loja_id
   WHERE p.status = 'pronto'::pedido_status
     AND p.entregador_id IS NULL
     AND (
       -- Vinculado à loja
       (_scope IN ('somente_vinculados','vinculados_e_externos')
         AND EXISTS (
           SELECT 1 FROM public.loja_entregadores le
            WHERE le.loja_id = p.loja_id
              AND le.entregador_id = auth.uid()
              AND le.ativo = true
         ))
       OR
       -- Externo: loja sem entregador próprio online, e entregador aceita externos
       (_scope IN ('somente_externos','vinculados_e_externos')
         AND _aceita_ext
         AND NOT public.loja_tem_entregador_proprio_online(p.loja_id))
     )
   ORDER BY p.created_at ASC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.pedidos_pool_externo() TO authenticated, service_role;

-- 3) aceitar_pedido_externo — remove exigência de oferta ativa
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
BEGIN
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

  SELECT pool_aberto_scope INTO _scope FROM public.config_roteirizacao LIMIT 1;
  _scope := COALESCE(_scope, 'vinculados_e_externos');

  SELECT EXISTS (
    SELECT 1 FROM public.loja_entregadores le
     WHERE le.loja_id = _p.loja_id
       AND le.entregador_id = auth.uid()
       AND le.ativo = true
  ) INTO _vinculado;

  SELECT COALESCE(aceita_pedidos_externos, false) INTO _aceita_ext
    FROM public.profiles WHERE id = auth.uid();

  -- Aplica o escopo
  IF _vinculado AND _scope IN ('somente_vinculados','vinculados_e_externos') THEN
    -- ok, vinculado e escopo permite
    NULL;
  ELSIF NOT _vinculado
        AND _scope IN ('somente_externos','vinculados_e_externos')
        AND _aceita_ext
        AND NOT public.loja_tem_entregador_proprio_online(_p.loja_id) THEN
    -- ok, caminho de externo
    NULL;
  ELSE
    RAISE EXCEPTION 'Este pedido não está disponível para você';
  END IF;

  -- Recalcula taxa apenas no caminho externo (vinculado mantém a taxa da loja)
  IF NOT _vinculado THEN
    _km := public.haversine_km(
      _p.endereco_coleta_lat, _p.endereco_coleta_lng,
      _p.endereco_entrega_lat, _p.endereco_entrega_lng
    );
    _nova_taxa := COALESCE(public.calcular_tarifa_global(_km), _p.taxa_entrega);
    IF _p.forma_pagamento = 'cartao'::public.forma_pagamento THEN
      _nova_taxa := _nova_taxa * 2;
    END IF;
  ELSE
    _nova_taxa := _p.taxa_entrega;
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
    RAISE EXCEPTION 'Pedido já foi aceito por outro entregador';
  END IF;

  -- Marca qualquer oferta direcionada antiga deste entregador como aceita
  UPDATE public.pedido_ofertas
     SET status = 'aceito'
   WHERE pedido_id = _pedido_id
     AND entregador_id = auth.uid()
     AND status = 'ativo';

  RETURN _p;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.aceitar_pedido_externo(uuid) TO authenticated;
