
-- 1) Tabela de saques da loja
CREATE TABLE public.lojas_saques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  valor numeric NOT NULL CHECK (valor > 0),
  pix_chave text NOT NULL,
  status text NOT NULL DEFAULT 'solicitado' CHECK (status IN ('solicitado','pago','rejeitado','cancelado')),
  solicitado_em timestamptz NOT NULL DEFAULT now(),
  pago_em timestamptz,
  rejeitado_em timestamptz,
  motivo_rejeicao text,
  observacoes_admin text,
  comprovante_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lojas_saques_loja_id_idx ON public.lojas_saques(loja_id, solicitado_em DESC);
CREATE INDEX lojas_saques_status_idx ON public.lojas_saques(status, solicitado_em DESC);

GRANT SELECT, INSERT, UPDATE ON public.lojas_saques TO authenticated;
GRANT ALL ON public.lojas_saques TO service_role;

ALTER TABLE public.lojas_saques ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dono da loja lê seus saques"
  ON public.lojas_saques FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.lojas l WHERE l.id = lojas_saques.loja_id AND l.owner_id = auth.uid()));

CREATE POLICY "Dono da loja insere saques"
  ON public.lojas_saques FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.lojas l WHERE l.id = lojas_saques.loja_id AND l.owner_id = auth.uid()));

CREATE POLICY "Admin lê todos os saques da loja"
  ON public.lojas_saques FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admin atualiza saques da loja"
  ON public.lojas_saques FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER trg_lojas_saques_updated_at
  BEFORE UPDATE ON public.lojas_saques
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Resumo do saldo/saque da loja (1 saque por semana)
CREATE OR REPLACE FUNCTION public.loja_saldo_saque_resumo(_loja_id uuid)
RETURNS TABLE(
  saldo numeric,
  valor_minimo numeric,
  pode_sacar_hoje boolean,
  tem_saque_pendente boolean,
  ultimo_saque_em timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH ok AS (
    SELECT
      _loja_id AS loja_id,
      EXISTS (
        SELECT 1 FROM public.lojas l
        WHERE l.id = _loja_id
          AND (l.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
      ) AS autorizado
  ),
  s AS (
    SELECT COALESCE(saldo,0)::numeric AS saldo
    FROM public.lojas_saldo WHERE loja_id = _loja_id
  ),
  ult AS (
    SELECT MAX(solicitado_em) AS ultimo
    FROM public.lojas_saques
    WHERE loja_id = _loja_id AND status <> 'rejeitado'
  )
  SELECT
    COALESCE((SELECT saldo FROM s),0),
    50::numeric AS valor_minimo,
    (
      (SELECT autorizado FROM ok)
      AND COALESCE((SELECT saldo FROM s),0) >= 50
      AND NOT EXISTS (
        SELECT 1 FROM public.lojas_saques
        WHERE loja_id = _loja_id
          AND status IN ('solicitado','aprovado')
      )
      AND (
        (SELECT ultimo FROM ult) IS NULL
        OR (SELECT ultimo FROM ult) < now() - interval '7 days'
      )
    ) AS pode_sacar_hoje,
    EXISTS (
      SELECT 1 FROM public.lojas_saques
      WHERE loja_id = _loja_id AND status IN ('solicitado','aprovado')
    ) AS tem_saque_pendente,
    (SELECT ultimo FROM ult) AS ultimo_saque_em;
$$;

GRANT EXECUTE ON FUNCTION public.loja_saldo_saque_resumo(uuid) TO authenticated;

-- 3) Solicitar saque
CREATE OR REPLACE FUNCTION public.loja_solicitar_saque(_loja_id uuid, _valor numeric, _pix_chave text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _saldo numeric;
  _id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF _valor IS NULL OR _valor <= 0 THEN RAISE EXCEPTION 'Valor inválido'; END IF;
  IF _pix_chave IS NULL OR length(trim(_pix_chave)) < 5 THEN
    RAISE EXCEPTION 'Informe uma chave PIX válida';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.lojas WHERE id = _loja_id AND owner_id = auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão nesta loja';
  END IF;
  IF _valor < 50 THEN RAISE EXCEPTION 'Valor mínimo de saque: R$ 50,00'; END IF;

  -- 1 saque por semana
  IF EXISTS (
    SELECT 1 FROM public.lojas_saques
    WHERE loja_id = _loja_id AND status IN ('solicitado','aprovado')
  ) THEN
    RAISE EXCEPTION 'Já existe um saque pendente';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.lojas_saques
    WHERE loja_id = _loja_id AND status <> 'rejeitado'
      AND solicitado_em > now() - interval '7 days'
  ) THEN
    RAISE EXCEPTION 'Só é permitido 1 saque por semana';
  END IF;

  -- Trava a linha do saldo e valida
  SELECT COALESCE(saldo,0) INTO _saldo FROM public.lojas_saldo WHERE loja_id = _loja_id FOR UPDATE;
  IF COALESCE(_saldo,0) < _valor THEN
    RAISE EXCEPTION 'Saldo insuficiente';
  END IF;

  -- Debita saldo
  PERFORM public.aplicar_movimento_loja_saldo(_loja_id, -_valor, 'saque_solicitado', NULL,
    'Solicitação de saque via PIX');

  INSERT INTO public.lojas_saques (loja_id, valor, pix_chave)
  VALUES (_loja_id, _valor, trim(_pix_chave))
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.loja_solicitar_saque(uuid, numeric, text) TO authenticated;

-- 4) Devolve a public key da PLATAFORMA (unificado)
CREATE OR REPLACE FUNCTION public.get_mp_public_config(_loja_id uuid)
RETURNS TABLE(public_key text, ativo boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE((SELECT value FROM public.private_config WHERE key = 'mp_platform_public_key'), '') AS public_key,
    EXISTS (SELECT 1 FROM public.private_config WHERE key = 'mp_platform_access_token' AND length(value) > 0)
      AND _loja_id IS NOT NULL AS ativo;
$$;

-- 5) materializar_pedido_pendente credita valor_produtos na carteira da loja
CREATE OR REPLACE FUNCTION public.materializar_pedido_pendente(_pendente_id uuid, _mp_payment_id text, _mp_status text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_pend public.pedidos_pendentes_pagamento%ROWTYPE;
  v_pedido_id uuid;
  v_dados jsonb;
  v_valor_produtos numeric;
BEGIN
  SELECT * INTO v_pend
    FROM public.pedidos_pendentes_pagamento
   WHERE id = _pendente_id
   FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF v_pend.pedido_id IS NOT NULL THEN RETURN v_pend.pedido_id; END IF;

  v_dados := v_pend.dados;
  v_valor_produtos := (v_dados->>'valor_produtos')::numeric;

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
    'em_preparo'::public.pedido_status,
    _mp_payment_id, _mp_status, now()
  ) RETURNING id INTO v_pedido_id;

  UPDATE public.pedidos_pendentes_pagamento
     SET pedido_id = v_pedido_id,
         status = 'aprovado',
         mp_payment_id = COALESCE(_mp_payment_id, mp_payment_id),
         mp_payment_status = COALESCE(_mp_status, mp_payment_status),
         updated_at = now()
   WHERE id = _pendente_id;

  -- Credita a venda na carteira da loja (idempotente: só ocorre na primeira materialização)
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
$function$;
