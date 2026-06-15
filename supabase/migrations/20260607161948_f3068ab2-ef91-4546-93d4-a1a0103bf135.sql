
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.gerar_mensalidades_do_dia()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cfg public.config_financeiro%ROWTYPE;
  _loja record;
  _hoje date := CURRENT_DATE;
  _competencia date := date_trunc('month', _hoje)::date;
  _dia_hoje integer := EXTRACT(day FROM _hoje)::integer;
  _valor numeric;
  _dia integer;
  _count integer := 0;
BEGIN
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

    IF _dia <> _dia_hoje THEN CONTINUE; END IF;

    INSERT INTO public.mensalidades_loja (loja_id, competencia, valor, vencimento)
    VALUES (_loja.id, _competencia, _valor, _hoje)
    ON CONFLICT (loja_id, competencia) DO NOTHING;

    IF FOUND THEN _count := _count + 1; END IF;
  END LOOP;

  RETURN _count;
END;
$$;

-- Remove agendamento antigo se existir, e cria novo
DO $$
BEGIN
  PERFORM cron.unschedule('gerar-mensalidades-diario');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'gerar-mensalidades-diario',
  '5 3 * * *', -- todo dia às 03:05 UTC (~00:05 BRT)
  $$ SELECT public.gerar_mensalidades_do_dia(); $$
);
