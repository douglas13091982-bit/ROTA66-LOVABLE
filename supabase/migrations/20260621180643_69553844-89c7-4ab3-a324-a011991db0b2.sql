CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove agendamento anterior se existir (idempotente)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'mp-poll-pendentes-5min') THEN
    PERFORM cron.unschedule('mp-poll-pendentes-5min');
  END IF;
END $$;

SELECT cron.schedule(
  'mp-poll-pendentes-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--94fe485e-cde1-4611-9db7-d8635e0448a7.lovable.app/api/public/hooks/mp-poll-pendentes',
    headers := '{"Content-Type": "application/json", "apikey": "sb_publishable_nSZWvtTXRn3m6UNbe6OcyA_pYok8g_6"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);