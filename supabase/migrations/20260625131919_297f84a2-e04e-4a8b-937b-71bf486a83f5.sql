
CREATE TABLE IF NOT EXISTS public.system_alerts_config (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton = true),
  query_mean_ms_warn numeric NOT NULL DEFAULT 200,
  query_mean_ms_crit numeric NOT NULL DEFAULT 500,
  query_max_ms_crit numeric NOT NULL DEFAULT 5000,
  connections_warn integer NOT NULL DEFAULT 40,
  connections_crit integer NOT NULL DEFAULT 50,
  pedidos_pagamento_pendente_min integer NOT NULL DEFAULT 30,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.system_alerts_config (singleton) VALUES (true)
ON CONFLICT (singleton) DO NOTHING;

GRANT SELECT, UPDATE ON public.system_alerts_config TO authenticated;
GRANT ALL ON public.system_alerts_config TO service_role;
ALTER TABLE public.system_alerts_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin manage alerts config"
  ON public.system_alerts_config FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE TABLE IF NOT EXISTS public.system_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  severidade text NOT NULL CHECK (severidade IN ('warn','crit')),
  mensagem text NOT NULL,
  metric_value numeric,
  threshold numeric,
  metadata jsonb,
  resolvido boolean NOT NULL DEFAULT false,
  resolvido_em timestamptz,
  resolvido_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_alerts_ativos
  ON public.system_alerts (resolvido, created_at DESC)
  WHERE resolvido = false;

CREATE INDEX IF NOT EXISTS idx_system_alerts_tipo_ativo
  ON public.system_alerts (tipo, resolvido, created_at DESC);

GRANT SELECT, UPDATE ON public.system_alerts TO authenticated;
GRANT ALL ON public.system_alerts TO service_role;
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin manage alerts"
  ON public.system_alerts FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE OR REPLACE FUNCTION public.check_system_alerts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
DECLARE
  _cfg public.system_alerts_config%ROWTYPE;
  _conn_count integer;
  _slow_query record;
  _pedidos_pendentes integer;
  _criados integer := 0;
  _tipo text; _sev text; _msg text; _val numeric; _thr numeric; _meta jsonb;
BEGIN
  SELECT * INTO _cfg FROM public.system_alerts_config WHERE singleton = true LIMIT 1;
  IF _cfg IS NULL THEN RETURN 0; END IF;

  -- a) Conexões
  SELECT count(*) INTO _conn_count FROM pg_stat_activity WHERE datname = current_database();

  IF _conn_count >= _cfg.connections_crit THEN
    _tipo := 'connections_high'; _sev := 'crit';
    _msg := format('Conexões ativas em nível crítico: %s', _conn_count);
    _val := _conn_count; _thr := _cfg.connections_crit;
  ELSIF _conn_count >= _cfg.connections_warn THEN
    _tipo := 'connections_high'; _sev := 'warn';
    _msg := format('Conexões ativas altas: %s', _conn_count);
    _val := _conn_count; _thr := _cfg.connections_warn;
  ELSE
    _tipo := NULL;
  END IF;

  IF _tipo IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.system_alerts
    WHERE tipo = _tipo AND resolvido = false
      AND created_at > now() - interval '30 minutes'
  ) THEN
    INSERT INTO public.system_alerts (tipo, severidade, mensagem, metric_value, threshold)
    VALUES (_tipo, _sev, _msg, _val, _thr);
    _criados := _criados + 1;
  END IF;

  -- b) Queries lentas
  FOR _slow_query IN
    SELECT substring(query from 1 for 200) AS query_short,
           mean_exec_time, max_exec_time, calls
    FROM pg_stat_statements
    WHERE calls > 20
      AND (mean_exec_time >= _cfg.query_mean_ms_crit OR max_exec_time >= _cfg.query_max_ms_crit)
    ORDER BY mean_exec_time DESC
    LIMIT 5
  LOOP
    _tipo := 'slow_query:' || md5(_slow_query.query_short);
    _sev := CASE WHEN _slow_query.mean_exec_time >= _cfg.query_mean_ms_crit THEN 'crit' ELSE 'warn' END;
    _msg := format('Query lenta: média %sms, máx %sms (%s execuções)',
      round(_slow_query.mean_exec_time::numeric, 0),
      round(_slow_query.max_exec_time::numeric, 0),
      _slow_query.calls);
    _meta := jsonb_build_object('query', _slow_query.query_short, 'calls', _slow_query.calls);

    IF NOT EXISTS (
      SELECT 1 FROM public.system_alerts
      WHERE tipo = _tipo AND resolvido = false
        AND created_at > now() - interval '30 minutes'
    ) THEN
      INSERT INTO public.system_alerts (tipo, severidade, mensagem, metric_value, threshold, metadata)
      VALUES (_tipo, _sev, _msg, _slow_query.mean_exec_time, _cfg.query_mean_ms_crit, _meta);
      _criados := _criados + 1;
    END IF;
  END LOOP;

  -- c) Pedidos travados em aguardando_pagamento
  SELECT count(*) INTO _pedidos_pendentes
  FROM public.pedidos
  WHERE status = 'aguardando_pagamento'::pedido_status
    AND created_at < now() - (_cfg.pedidos_pagamento_pendente_min || ' minutes')::interval
    AND created_at > now() - interval '24 hours';

  IF _pedidos_pendentes >= 5 AND NOT EXISTS (
    SELECT 1 FROM public.system_alerts
    WHERE tipo = 'pedidos_pagamento_travados' AND resolvido = false
      AND created_at > now() - interval '30 minutes'
  ) THEN
    INSERT INTO public.system_alerts (tipo, severidade, mensagem, metric_value, threshold)
    VALUES (
      'pedidos_pagamento_travados', 'warn',
      format('%s pedidos travados em aguardando_pagamento há mais de %s min',
        _pedidos_pendentes, _cfg.pedidos_pagamento_pendente_min),
      _pedidos_pendentes, 5
    );
    _criados := _criados + 1;
  END IF;

  RETURN _criados;
END;
$func$;

DO $$
BEGIN
  PERFORM cron.unschedule('check-system-alerts-5min');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'check-system-alerts-5min',
  '*/5 * * * *',
  $$ SELECT public.check_system_alerts(); $$
);

CREATE OR REPLACE FUNCTION public.resolver_system_alert(_alert_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  UPDATE public.system_alerts
    SET resolvido = true, resolvido_em = now(), resolvido_por = auth.uid()
  WHERE id = _alert_id;
END;
$$;
