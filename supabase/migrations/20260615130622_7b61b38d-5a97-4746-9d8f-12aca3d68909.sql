DROP FUNCTION IF EXISTS public.entregador_saldo_atual();

CREATE OR REPLACE FUNCTION public.entregador_saldo_atual()
RETURNS TABLE(
  saldo numeric,
  saldo_minimo numeric,
  ativo boolean,
  bloqueado boolean,
  mensalidade_valor numeric,
  dia_vencimento integer,
  mensalidade_paga boolean,
  competencia_atual date,
  data_vencimento_atual date
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH cfg AS (
    SELECT c.*
    FROM public.config_creditos_entregador c
    WHERE c.singleton = true
  ),
  hoje AS (
    SELECT (now() AT TIME ZONE 'America/Sao_Paulo')::date AS dt
  )
  SELECT
    COALESCE(ec.saldo, 0),
    c.saldo_minimo,
    c.ativo,
    (c.ativo AND COALESCE(ec.saldo, 0) < c.saldo_minimo) AS bloqueado,
    c.mensalidade_valor,
    c.dia_vencimento,
    EXISTS (
      SELECT 1
      FROM public.entregador_creditos_transacoes t
      WHERE t.entregador_id = auth.uid()
        AND t.tipo = 'mensalidade'
        AND t.competencia = date_trunc('month', hoje.dt)::date
    ) AS mensalidade_paga,
    date_trunc('month', hoje.dt)::date AS competencia_atual,
    make_date(
      EXTRACT(year FROM hoje.dt)::int,
      EXTRACT(month FROM hoje.dt)::int,
      LEAST(c.dia_vencimento, EXTRACT(day FROM (date_trunc('month', hoje.dt) + interval '1 month - 1 day'))::int)
    ) AS data_vencimento_atual
  FROM cfg c
  CROSS JOIN hoje
  LEFT JOIN public.entregador_creditos ec ON ec.entregador_id = auth.uid();
$$;