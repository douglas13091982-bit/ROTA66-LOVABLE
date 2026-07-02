
-- 1) Nova coluna: saldo das vendas do catálogo
ALTER TABLE public.lojas_saldo
  ADD COLUMN IF NOT EXISTS saldo_vendas numeric NOT NULL DEFAULT 0;

-- 2) aplicar_movimento_loja_saldo: roteia o delta para a carteira certa
CREATE OR REPLACE FUNCTION public.aplicar_movimento_loja_saldo(
  _loja_id uuid, _delta numeric, _tipo text, _pedido_id uuid, _descricao text
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _novo numeric;
  _is_vendas boolean := _tipo IN ('credito_venda','saque_solicitado','estorno_saque');
BEGIN
  IF _is_vendas THEN
    INSERT INTO public.lojas_saldo (loja_id, saldo, saldo_vendas, updated_at)
    VALUES (_loja_id, 0, _delta, now())
    ON CONFLICT (loja_id) DO UPDATE
      SET saldo_vendas = lojas_saldo.saldo_vendas + _delta,
          updated_at = now()
    RETURNING saldo_vendas INTO _novo;
  ELSE
    INSERT INTO public.lojas_saldo (loja_id, saldo, saldo_vendas, updated_at)
    VALUES (_loja_id, _delta, 0, now())
    ON CONFLICT (loja_id) DO UPDATE
      SET saldo = lojas_saldo.saldo + _delta,
          updated_at = now()
    RETURNING saldo INTO _novo;
  END IF;

  INSERT INTO public.lojas_saldo_movimentos (loja_id, tipo, valor, saldo_apos, pedido_id, descricao)
  VALUES (_loja_id, _tipo, _delta, _novo, _pedido_id, _descricao);

  RETURN _novo;
END;
$function$;

-- 3) Recalcula os dois saldos a partir do histórico de movimentos
WITH agg AS (
  SELECT
    loja_id,
    COALESCE(SUM(CASE WHEN tipo IN ('credito_venda','saque_solicitado','estorno_saque') THEN 0 ELSE valor END), 0) AS s_entregas,
    COALESCE(SUM(CASE WHEN tipo IN ('credito_venda','saque_solicitado','estorno_saque') THEN valor ELSE 0 END), 0) AS s_vendas
  FROM public.lojas_saldo_movimentos
  GROUP BY loja_id
)
INSERT INTO public.lojas_saldo (loja_id, saldo, saldo_vendas, updated_at)
SELECT loja_id, s_entregas, s_vendas, now() FROM agg
ON CONFLICT (loja_id) DO UPDATE
  SET saldo = EXCLUDED.saldo,
      saldo_vendas = EXCLUDED.saldo_vendas,
      updated_at = now();

-- 4) Resumo do saque usa saldo_vendas
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
    SELECT EXISTS (
      SELECT 1 FROM public.lojas l
      WHERE l.id = _loja_id
        AND (l.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
    ) AS autorizado
  ),
  s AS (
    SELECT COALESCE(saldo_vendas,0)::numeric AS saldo
    FROM public.lojas_saldo WHERE loja_id = _loja_id
  ),
  ult AS (
    SELECT MAX(solicitado_em) AS ultimo
    FROM public.lojas_saques
    WHERE loja_id = _loja_id AND status <> 'rejeitado'
  )
  SELECT
    COALESCE((SELECT saldo FROM s),0),
    50::numeric,
    (
      (SELECT autorizado FROM ok)
      AND COALESCE((SELECT saldo FROM s),0) >= 50
      AND NOT EXISTS (
        SELECT 1 FROM public.lojas_saques
        WHERE loja_id = _loja_id AND status IN ('solicitado','aprovado')
      )
      AND (
        (SELECT ultimo FROM ult) IS NULL
        OR (SELECT ultimo FROM ult) < now() - interval '7 days'
      )
    ),
    EXISTS (
      SELECT 1 FROM public.lojas_saques
      WHERE loja_id = _loja_id AND status IN ('solicitado','aprovado')
    ),
    (SELECT ultimo FROM ult);
$$;

-- 5) Solicitar saque valida saldo_vendas
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

  SELECT COALESCE(saldo_vendas,0) INTO _saldo FROM public.lojas_saldo WHERE loja_id = _loja_id FOR UPDATE;
  IF COALESCE(_saldo,0) < _valor THEN
    RAISE EXCEPTION 'Saldo insuficiente';
  END IF;

  PERFORM public.aplicar_movimento_loja_saldo(_loja_id, -_valor, 'saque_solicitado', NULL,
    'Solicitação de saque via PIX');

  INSERT INTO public.lojas_saques (loja_id, valor, pix_chave)
  VALUES (_loja_id, _valor, trim(_pix_chave))
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;
