
-- Config global: mensalidade padrão
ALTER TABLE public.config_financeiro
  ADD COLUMN mensalidade_valor_padrao numeric NOT NULL DEFAULT 0,
  ADD COLUMN dia_vencimento_padrao integer NOT NULL DEFAULT 10;

-- Override por loja
ALTER TABLE public.lojas
  ADD COLUMN mensalidade_valor numeric,
  ADD COLUMN dia_vencimento_mensalidade integer;

-- Tabela de mensalidades
CREATE TABLE public.mensalidades_loja (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL,
  competencia date NOT NULL,
  valor numeric NOT NULL,
  vencimento date NOT NULL,
  pago boolean NOT NULL DEFAULT false,
  pago_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (loja_id, competencia)
);

CREATE INDEX mensalidades_loja_loja_idx ON public.mensalidades_loja (loja_id, pago);

GRANT SELECT ON public.mensalidades_loja TO authenticated;
GRANT ALL ON public.mensalidades_loja TO service_role;

ALTER TABLE public.mensalidades_loja ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dono da loja vê mensalidades"
  ON public.mensalidades_loja FOR SELECT TO authenticated
  USING (is_loja_owner(auth.uid(), loja_id));

CREATE POLICY "Super admin vê todas mensalidades"
  ON public.mensalidades_loja FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admin gerencia mensalidades"
  ON public.mensalidades_loja FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER trg_mensalidades_loja_updated_at
  BEFORE UPDATE ON public.mensalidades_loja
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Função que gera mensalidades do mês corrente
CREATE OR REPLACE FUNCTION public.gerar_mensalidades_mes()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cfg public.config_financeiro%ROWTYPE;
  _loja record;
  _competencia date := date_trunc('month', now())::date;
  _valor numeric;
  _dia integer;
  _venc date;
  _count integer := 0;
BEGIN
  IF NOT has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  SELECT * INTO _cfg FROM public.config_financeiro WHERE singleton = true LIMIT 1;

  FOR _loja IN
    SELECT id, mensalidade_valor, dia_vencimento_mensalidade
    FROM public.lojas
    WHERE status = 'aprovado'::status_moderacao
  LOOP
    _valor := COALESCE(_loja.mensalidade_valor, _cfg.mensalidade_valor_padrao, 0);
    IF _valor <= 0 THEN CONTINUE; END IF;
    _dia := COALESCE(_loja.dia_vencimento_mensalidade, _cfg.dia_vencimento_padrao, 10);
    _dia := LEAST(GREATEST(_dia, 1), 28);
    _venc := _competencia + (_dia - 1);

    INSERT INTO public.mensalidades_loja (loja_id, competencia, valor, vencimento)
    VALUES (_loja.id, _competencia, _valor, _venc)
    ON CONFLICT (loja_id, competencia) DO NOTHING;

    IF FOUND THEN _count := _count + 1; END IF;
  END LOOP;

  RETURN _count;
END;
$$;
