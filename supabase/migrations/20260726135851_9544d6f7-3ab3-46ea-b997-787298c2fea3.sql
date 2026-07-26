CREATE OR REPLACE FUNCTION public.materializar_pedido_pendente(
  _pendente_id uuid,
  _mp_payment_id text DEFAULT NULL,
  _mp_status text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pend public.pedidos_pendentes_pagamento%ROWTYPE;
  v_pedido_id uuid;
  v_dados jsonb;
  v_valor_produtos numeric;
  v_status_inicial text;
BEGIN
  SELECT * INTO v_pend
    FROM public.pedidos_pendentes_pagamento
   WHERE id = _pendente_id
   FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF v_pend.pedido_id IS NOT NULL THEN RETURN v_pend.pedido_id; END IF;

  v_dados := v_pend.dados;
  v_valor_produtos := (v_dados->>'valor_produtos')::numeric;

  SELECT COALESCE(l.catalogo_status_inicial, 'em_preparo')
    INTO v_status_inicial
    FROM public.lojas l
   WHERE l.id = v_pend.loja_id;
  IF v_status_inicial IS NULL OR v_status_inicial NOT IN ('em_preparo','pronto') THEN
    v_status_inicial := 'em_preparo';
  END IF;

  INSERT INTO public.pedidos (
    loja_id, cliente_user_id, cliente_nome, cliente_telefone,
    endereco_entrega, endereco_entrega_lat, endereco_entrega_lng,
    complemento, cidade,
    endereco_coleta, endereco_coleta_lat, endereco_coleta_lng,
    observacoes, forma_pagamento, troco_para, itens,
    valor_produtos, taxa_entrega, valor_total,
    status, mp_payment_id, mp_payment_status, pagamento_aprovado_em
  ) VALUES (
    v_pend.loja_id, NULL,
    v_dados->>'cliente_nome', v_dados->>'cliente_telefone',
    v_dados->>'endereco_entrega',
    NULLIF(v_dados->>'endereco_entrega_lat','')::numeric,
    NULLIF(v_dados->>'endereco_entrega_lng','')::numeric,
    v_dados->>'complemento', v_dados->>'cidade',
    v_dados->>'endereco_coleta',
    NULLIF(v_dados->>'endereco_coleta_lat','')::numeric,
    NULLIF(v_dados->>'endereco_coleta_lng','')::numeric,
    v_dados->>'observacoes',
    v_pend.forma_pagamento::public.forma_pagamento,
    NULLIF(v_dados->>'troco_para','')::numeric,
    COALESCE(v_dados->'itens','[]'::jsonb),
    v_valor_produtos,
    (v_dados->>'taxa_entrega')::numeric,
    v_pend.valor_total,
    v_status_inicial::public.pedido_status,
    _mp_payment_id, _mp_status, now()
  ) RETURNING id INTO v_pedido_id;

  UPDATE public.pedidos_pendentes_pagamento
     SET pedido_id = v_pedido_id,
         status = 'aprovado',
         mp_payment_id = COALESCE(_mp_payment_id, mp_payment_id),
         mp_payment_status = COALESCE(_mp_status, mp_payment_status),
         updated_at = now()
   WHERE id = _pendente_id;

  IF v_valor_produtos IS NOT NULL AND v_valor_produtos > 0 THEN
    PERFORM public.aplicar_movimento_loja_saldo(
      v_pend.loja_id,
      v_valor_produtos,
      'credito_venda',
      v_pedido_id,
      'Venda pedido #' || v_pedido_id::text || COALESCE(' (MP ' || _mp_payment_id || ')','')
    );
  END IF;

  RETURN v_pedido_id;
END;
$$;