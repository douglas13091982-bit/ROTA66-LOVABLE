
-- 1) Trigger de cobrança usa o snapshot da taxa do plano gravado no pedido
CREATE OR REPLACE FUNCTION public.gerar_cobranca_pedido_entregue()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _taxa numeric;
  _prazo integer;
BEGIN
  IF NEW.status = 'entregue'::pedido_status
     AND (OLD.status IS DISTINCT FROM NEW.status) THEN

    -- Snapshot da taxa do plano gravado no pedido (fonte da verdade).
    -- Fallback para pedidos legados: valor atual da loja se snapshot nulo.
    IF NEW.taxa_por_pedido_aplicada IS NOT NULL THEN
      _taxa := NEW.taxa_por_pedido_aplicada;
    ELSE
      SELECT CASE
        WHEN COALESCE(plano_mensal_ativo, false) THEN 0
        ELSE COALESCE(taxa_por_pedido, 0)
      END
      INTO _taxa
      FROM public.lojas
      WHERE id = NEW.loja_id;
    END IF;

    IF _taxa IS NULL OR _taxa <= 0 THEN
      RETURN NEW;
    END IF;

    SELECT prazo_pagamento_dias
      INTO _prazo
      FROM public.config_financeiro
     WHERE singleton = true
     LIMIT 1;
    IF _prazo IS NULL THEN _prazo := 30; END IF;

    INSERT INTO public.cobrancas_loja (loja_id, pedido_id, valor, vencimento)
    VALUES (NEW.loja_id, NEW.id, _taxa, now() + make_interval(days => _prazo))
    ON CONFLICT (pedido_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

-- 2) Pool externo devolve o snapshot quando existir
CREATE OR REPLACE FUNCTION public.pedidos_pool_externo()
RETURNS TABLE(id uuid, numero integer, loja_id uuid, cliente_user_id uuid, cliente_nome text, cliente_telefone text, endereco_entrega text, cidade text, complemento text, itens jsonb, valor_produtos numeric, taxa_entrega numeric, valor_total numeric, forma_pagamento forma_pagamento, troco_para numeric, status pedido_status, entregador_id uuid, observacoes text, created_at timestamp with time zone, updated_at timestamp with time zone, codigo_coleta text, codigo_entrega text, endereco_coleta text, coleta_confirmada_em timestamp with time zone, entrega_confirmada_em timestamp with time zone, arquivado boolean, rota_id uuid, rota_ordem integer, atribuido_automaticamente boolean, endereco_entrega_lat numeric, endereco_coleta_lat numeric, endereco_entrega_lng numeric, endereco_coleta_lng numeric, duracao_estimada_seg integer, distancia_metros integer, eta_chegada_at timestamp with time zone, bonus_entregador numeric, entrega_paga_em timestamp with time zone, entrega_paga boolean, oferta_expira_em timestamp with time zone, loja_nome text, loja_bairro text, loja_plano_mensal_ativo boolean, loja_taxa_por_pedido numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _scope text;
  _aceita_ext boolean;
  _raio_km numeric;
  _ent_lat numeric;
  _ent_lng numeric;
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;

  SELECT COALESCE(escopo_pedidos, 'somente_vinculados'),
         COALESCE(aceita_pedidos_externos, false),
         COALESCE(raio_km, 0)
    INTO _scope, _aceita_ext, _raio_km
    FROM public.entregador_status_conta
   WHERE entregador_id = _uid;

  IF _scope IS NULL THEN _scope := 'somente_vinculados'; END IF;

  SELECT es.lat, es.lng INTO _ent_lat, _ent_lng
    FROM public.entregador_status es
   WHERE es.entregador_id = _uid
     AND es.updated_at > now() - interval '30 minutes';

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
         COALESCE(p.taxa_por_pedido_aplicada, l.taxa_por_pedido, 0) AS loja_taxa_por_pedido
    FROM public.pedidos p
    JOIN public.lojas l ON l.id = p.loja_id
    LEFT JOIN public.lojas_saldo ls ON ls.loja_id = p.loja_id
   WHERE p.status = 'pronto'::pedido_status
     AND p.entregador_id IS NULL
     AND COALESCE(ls.saldo, 0) >= COALESCE(p.taxa_entrega, 0)
     AND (
       (_scope IN ('somente_vinculados','vinculados_e_externos')
         AND EXISTS (
           SELECT 1 FROM public.loja_entregadores le
            WHERE le.loja_id = p.loja_id
              AND le.entregador_id = _uid
              AND le.ativo = true
         ))
       OR
       (_scope IN ('somente_externos','vinculados_e_externos')
         AND _aceita_ext
         AND NOT public.loja_tem_entregador_proprio_online(p.loja_id))
     )
     AND (
       _raio_km <= 0
       OR _ent_lat IS NULL OR _ent_lng IS NULL
       OR public.haversine_km(_ent_lat, _ent_lng, p.endereco_coleta_lat, p.endereco_coleta_lng) <= _raio_km
     );
END;
$function$;
