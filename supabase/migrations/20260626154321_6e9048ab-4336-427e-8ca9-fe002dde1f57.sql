
CREATE TABLE public.pedidos_pendentes_pagamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  dados jsonb NOT NULL,
  valor_total numeric NOT NULL,
  forma_pagamento text NOT NULL,
  mp_payment_id text,
  mp_payment_status text,
  mp_pix_qr_code text,
  mp_pix_qr_base64 text,
  mp_pix_expira_em timestamptz,
  status text NOT NULL DEFAULT 'aguardando',
  pedido_id uuid REFERENCES public.pedidos(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pendentes_loja_status ON public.pedidos_pendentes_pagamento(loja_id, status);
CREATE INDEX idx_pendentes_mp_payment_id ON public.pedidos_pendentes_pagamento(mp_payment_id) WHERE mp_payment_id IS NOT NULL;
CREATE INDEX idx_pendentes_created_status ON public.pedidos_pendentes_pagamento(created_at, status);

GRANT ALL ON public.pedidos_pendentes_pagamento TO service_role;
ALTER TABLE public.pedidos_pendentes_pagamento ENABLE ROW LEVEL SECURITY;
-- Sem políticas: somente service_role (backend) acessa.

CREATE OR REPLACE FUNCTION public.materializar_pedido_pendente(
  _pendente_id uuid,
  _mp_payment_id text,
  _mp_status text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pend public.pedidos_pendentes_pagamento%ROWTYPE;
  v_pedido_id uuid;
  v_dados jsonb;
BEGIN
  SELECT * INTO v_pend
    FROM public.pedidos_pendentes_pagamento
   WHERE id = _pendente_id
   FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF v_pend.pedido_id IS NOT NULL THEN RETURN v_pend.pedido_id; END IF;

  v_dados := v_pend.dados;

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
    v_pend.forma_pagamento,
    NULLIF(v_dados->>'troco_para','')::numeric,
    COALESCE(v_dados->'itens','[]'::jsonb),
    (v_dados->>'valor_produtos')::numeric,
    (v_dados->>'taxa_entrega')::numeric,
    v_pend.valor_total,
    'em_preparo',
    _mp_payment_id, _mp_status, now()
  ) RETURNING id INTO v_pedido_id;

  UPDATE public.pedidos_pendentes_pagamento
     SET pedido_id = v_pedido_id,
         status = 'aprovado',
         mp_payment_id = COALESCE(_mp_payment_id, mp_payment_id),
         mp_payment_status = COALESCE(_mp_status, mp_payment_status),
         updated_at = now()
   WHERE id = _pendente_id;

  RETURN v_pedido_id;
END;
$$;

REVOKE ALL ON FUNCTION public.materializar_pedido_pendente(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.materializar_pedido_pendente(uuid, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.touch_pendentes_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_pendentes_updated_at
BEFORE UPDATE ON public.pedidos_pendentes_pagamento
FOR EACH ROW EXECUTE FUNCTION public.touch_pendentes_updated_at();
