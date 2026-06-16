CREATE OR REPLACE FUNCTION public.pedidos_pool_externo()
 RETURNS TABLE(id uuid, numero integer, loja_id uuid, cliente_user_id uuid, cliente_nome text, cliente_telefone text, endereco_entrega text, cidade text, complemento text, itens jsonb, valor_produtos numeric, taxa_entrega numeric, valor_total numeric, forma_pagamento forma_pagamento, troco_para numeric, status pedido_status, entregador_id uuid, observacoes text, created_at timestamp with time zone, updated_at timestamp with time zone, codigo_coleta text, codigo_entrega text, endereco_coleta text, coleta_confirmada_em timestamp with time zone, entrega_confirmada_em timestamp with time zone, arquivado boolean, rota_id uuid, rota_ordem integer, atribuido_automaticamente boolean, endereco_entrega_lat numeric, endereco_coleta_lat numeric, endereco_entrega_lng numeric, endereco_coleta_lng numeric, duracao_estimada_seg integer, distancia_metros integer, eta_chegada_at timestamp with time zone, bonus_entregador numeric, entrega_paga_em timestamp with time zone, entrega_paga boolean, oferta_expira_em timestamp with time zone, loja_nome text, loja_bairro text, loja_plano_mensal_ativo boolean)
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

  SELECT COALESCE(pr.aceita_pedidos_externos, false) INTO _aceita_ext
    FROM public.profiles pr WHERE pr.id = auth.uid();

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
$function$;