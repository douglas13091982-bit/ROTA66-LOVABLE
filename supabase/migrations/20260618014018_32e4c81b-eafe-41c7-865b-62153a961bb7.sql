
-- 1) Coluna na loja (cópia do plano)
ALTER TABLE public.lojas
  ADD COLUMN IF NOT EXISTS taxa_por_pedido numeric NOT NULL DEFAULT 0;

-- 2) Backfill com base no plano atual
UPDATE public.lojas l
   SET taxa_por_pedido = COALESCE(p.taxa_por_pedido, 0)
  FROM public.planos_loja p
 WHERE l.plano_id = p.id;

-- 3) Trigger aplicar_plano_loja agora copia também a taxa_por_pedido
CREATE OR REPLACE FUNCTION public.aplicar_plano_loja()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _p public.planos_loja%ROWTYPE;
BEGIN
  IF NEW.plano_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.plano_id = OLD.plano_id THEN
    RETURN NEW;
  END IF;

  SELECT * INTO _p FROM public.planos_loja WHERE id = NEW.plano_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  NEW.mensalidade_valor    := _p.mensalidade_valor;
  NEW.dia_vencimento_mensalidade := _p.dia_vencimento;
  NEW.taxa_por_pedido      := COALESCE(_p.taxa_por_pedido, 0);
  NEW.plano_mensal_ativo   := (COALESCE(_p.taxa_por_pedido, 0) = 0);

  IF _p.mensalidade_valor > 0 THEN
    NEW.catalogo_ativo := true;
  END IF;

  RETURN NEW;
END;
$$;

-- 4) get_ganho_hoje agora desconta a taxa DA LOJA do pedido
CREATE OR REPLACE FUNCTION public.get_ganho_hoje(_entregador_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(
    GREATEST(
      0,
      p.taxa_entrega - CASE
        WHEN COALESCE(l.plano_mensal_ativo, false) THEN 0
        ELSE COALESCE(l.taxa_por_pedido, 0)
      END
    ) + COALESCE(p.bonus_entregador, 0)
  ), 0)::numeric
  FROM public.pedidos p
  JOIN public.lojas l ON l.id = p.loja_id
  WHERE p.entregador_id = _entregador_id
    AND p.status = 'entregue'
    AND COALESCE(p.entrega_confirmada_em, p.updated_at)
        >= (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo');
$$;

GRANT EXECUTE ON FUNCTION public.get_ganho_hoje(uuid) TO authenticated, service_role;

-- 5) pedidos_pool_externo passa a expor loja_taxa_por_pedido
DROP FUNCTION IF EXISTS public.pedidos_pool_externo();

CREATE FUNCTION public.pedidos_pool_externo()
RETURNS TABLE(
  id uuid, numero integer, loja_id uuid, cliente_user_id uuid, cliente_nome text, cliente_telefone text,
  endereco_entrega text, cidade text, complemento text, itens jsonb, valor_produtos numeric, taxa_entrega numeric,
  valor_total numeric, forma_pagamento forma_pagamento, troco_para numeric, status pedido_status,
  entregador_id uuid, observacoes text, created_at timestamptz, updated_at timestamptz,
  codigo_coleta text, codigo_entrega text, endereco_coleta text,
  coleta_confirmada_em timestamptz, entrega_confirmada_em timestamptz, arquivado boolean,
  rota_id uuid, rota_ordem integer, atribuido_automaticamente boolean,
  endereco_entrega_lat numeric, endereco_coleta_lat numeric, endereco_entrega_lng numeric, endereco_coleta_lng numeric,
  duracao_estimada_seg integer, distancia_metros integer, eta_chegada_at timestamptz,
  bonus_entregador numeric, entrega_paga_em timestamptz, entrega_paga boolean,
  oferta_expira_em timestamptz,
  loja_nome text, loja_bairro text,
  loja_plano_mensal_ativo boolean,
  loja_taxa_por_pedido numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _scope text;
  _aceita_ext boolean;
BEGIN
  IF NOT public.is_entregador_aprovado(auth.uid()) THEN
    RETURN;
  END IF;

  SELECT pool_aberto_scope INTO _scope FROM public.config_roteirizacao LIMIT 1;
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
         COALESCE(l.plano_mensal_ativo, false) AS loja_plano_mensal_ativo,
         COALESCE(l.taxa_por_pedido, 0) AS loja_taxa_por_pedido
    FROM public.pedidos p
    JOIN public.lojas l ON l.id = p.loja_id
   WHERE p.status = 'pronto'::pedido_status
     AND p.entregador_id IS NULL
     AND (
       (_scope IN ('somente_vinculados','vinculados_e_externos')
         AND EXISTS (
           SELECT 1 FROM public.loja_entregadores le
            WHERE le.loja_id = p.loja_id
              AND le.entregador_id = auth.uid()
              AND le.ativo = true
         ))
       OR
       (_scope IN ('somente_externos','vinculados_e_externos')
         AND _aceita_ext
         AND NOT public.loja_tem_entregador_proprio_online(p.loja_id))
     )
   ORDER BY p.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pedidos_pool_externo() TO authenticated, service_role;

-- 6) get_taxa_sistema(_loja_id) — versão por loja
CREATE OR REPLACE FUNCTION public.get_taxa_sistema_loja(_loja_id uuid)
RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(taxa_por_pedido, 0) FROM public.lojas WHERE id = _loja_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_taxa_sistema_loja(uuid) TO authenticated, service_role;
