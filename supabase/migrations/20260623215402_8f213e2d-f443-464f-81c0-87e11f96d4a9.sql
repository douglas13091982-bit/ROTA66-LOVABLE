-- Bloqueia pedidos de lojas sem saldo de entrega
-- 1) Filtra pool de pedidos para entregadores
-- 2) Impede UPDATE para status='pronto' quando loja não tem saldo (sem plano mensal)

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
    LEFT JOIN public.lojas_saldo ls ON ls.loja_id = p.loja_id
   WHERE p.status = 'pronto'::pedido_status
     AND p.entregador_id IS NULL
     -- Loja precisa ter saldo suficiente para cobrir a taxa do pedido,
     -- exceto se estiver no plano mensal (isento de débito por pedido)
     AND (
       COALESCE(l.plano_mensal_ativo, false) = true
       OR COALESCE(ls.saldo, 0) >= COALESCE(p.taxa_entrega, 0)
     )
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

-- Bloqueia colocar pedido como "pronto" se loja não tem saldo
CREATE OR REPLACE FUNCTION public.validar_saldo_loja_para_pedido()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _plano boolean;
  _saldo numeric;
  _taxa numeric;
BEGIN
  -- só valida quando o pedido entra (ou está sendo criado) em status 'pronto'
  IF NEW.status IS DISTINCT FROM 'pronto'::pedido_status THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'pronto'::pedido_status THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(plano_mensal_ativo, false) INTO _plano
    FROM public.lojas WHERE id = NEW.loja_id;
  IF COALESCE(_plano, false) THEN
    RETURN NEW;
  END IF;

  _taxa := COALESCE(NEW.taxa_entrega, 0);
  SELECT COALESCE(saldo, 0) INTO _saldo FROM public.lojas_saldo WHERE loja_id = NEW.loja_id;
  IF COALESCE(_saldo, 0) < _taxa THEN
    RAISE EXCEPTION 'Saldo insuficiente para liberar o pedido. Recarregue o saldo da loja para continuar.'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_saldo_loja_para_pedido ON public.pedidos;
CREATE TRIGGER trg_validar_saldo_loja_para_pedido
BEFORE INSERT OR UPDATE OF status ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION public.validar_saldo_loja_para_pedido();