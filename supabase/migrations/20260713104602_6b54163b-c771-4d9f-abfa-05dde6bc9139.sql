
-- 1) Coluna de modo de liberação de saque
ALTER TABLE public.config_financeiro
  ADD COLUMN IF NOT EXISTS saque_modo text NOT NULL DEFAULT 'dia_semana'
  CHECK (saque_modo IN ('dia_semana','valor'));

-- 2) Resumo do saldo do entregador com modo e regra
DROP FUNCTION IF EXISTS public.entregador_saldo_saque_resumo();

CREATE OR REPLACE FUNCTION public.entregador_saldo_saque_resumo()
RETURNS TABLE(
  saldo numeric,
  total_recebido numeric,
  total_sacado numeric,
  valor_minimo numeric,
  dia_semana_permitido smallint,
  modo text,
  pode_sacar_hoje boolean,
  tem_saque_pendente boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH cfg AS (
    SELECT
      saque_valor_minimo AS vmin,
      saque_dia_semana AS dia,
      COALESCE(saque_modo, 'dia_semana') AS modo
    FROM public.config_financeiro WHERE singleton = true LIMIT 1
  ),
  s AS (
    SELECT COALESCE(saldo,0) AS saldo, COALESCE(total_recebido,0) AS tr, COALESCE(total_sacado,0) AS ts
    FROM public.entregadores_saldo_saque WHERE entregador_id = auth.uid()
  )
  SELECT
    COALESCE((SELECT saldo FROM s), 0),
    COALESCE((SELECT tr FROM s), 0),
    COALESCE((SELECT ts FROM s), 0),
    cfg.vmin,
    cfg.dia,
    cfg.modo,
    CASE
      WHEN cfg.modo = 'valor'
        THEN COALESCE((SELECT saldo FROM s), 0) >= cfg.vmin
      ELSE
        (EXTRACT(dow FROM (now() AT TIME ZONE 'America/Sao_Paulo'))::int = cfg.dia
         AND COALESCE((SELECT saldo FROM s), 0) >= cfg.vmin)
    END,
    EXISTS (
      SELECT 1 FROM public.entregador_saques
      WHERE entregador_id = auth.uid()
        AND status IN ('solicitado','aprovado')
    )
  FROM cfg;
$$;

-- 3) Solicitação respeita o modo
CREATE OR REPLACE FUNCTION public.entregador_solicitar_saque(_valor numeric, _pix_chave text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _cfg public.config_financeiro%ROWTYPE;
  _saldo numeric;
  _hoje_dow int;
  _id uuid;
  _modo text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF _valor IS NULL OR _valor <= 0 THEN RAISE EXCEPTION 'Valor inválido'; END IF;
  IF _pix_chave IS NULL OR length(trim(_pix_chave)) < 5 THEN
    RAISE EXCEPTION 'Informe uma chave PIX válida';
  END IF;

  SELECT * INTO _cfg FROM public.config_financeiro WHERE singleton = true LIMIT 1;
  IF _cfg IS NULL THEN RAISE EXCEPTION 'Configuração financeira ausente'; END IF;

  _modo := COALESCE(_cfg.saque_modo, 'dia_semana');

  IF _valor < _cfg.saque_valor_minimo THEN
    RAISE EXCEPTION 'Valor mínimo de saque: R$ %', _cfg.saque_valor_minimo;
  END IF;

  IF _modo = 'dia_semana' THEN
    _hoje_dow := EXTRACT(dow FROM (now() AT TIME ZONE 'America/Sao_Paulo'))::int;
    IF _hoje_dow <> _cfg.saque_dia_semana THEN
      RAISE EXCEPTION 'Saques só podem ser solicitados no dia configurado pela administração';
    END IF;
  END IF;

  SELECT COALESCE(saldo, 0) INTO _saldo
    FROM public.entregadores_saldo_saque WHERE entregador_id = auth.uid();
  IF COALESCE(_saldo, 0) < _valor THEN
    RAISE EXCEPTION 'Saldo insuficiente';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.entregador_saques
    WHERE entregador_id = auth.uid() AND status IN ('solicitado','aprovado')
  ) THEN
    RAISE EXCEPTION 'Você já tem um saque pendente';
  END IF;

  INSERT INTO public.entregador_saques (entregador_id, valor, pix_chave)
  VALUES (auth.uid(), _valor, trim(_pix_chave))
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;
