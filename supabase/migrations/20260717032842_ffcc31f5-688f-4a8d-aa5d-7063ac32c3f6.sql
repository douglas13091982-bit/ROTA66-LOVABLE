
CREATE TABLE public.mp_webhook_eventos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mp_payment_id text NOT NULL,
  mp_status text NOT NULL,
  origem text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb,
  CONSTRAINT mp_webhook_eventos_unico UNIQUE (mp_payment_id, mp_status, origem)
);

CREATE INDEX idx_mp_webhook_eventos_payment ON public.mp_webhook_eventos (mp_payment_id);

GRANT ALL ON public.mp_webhook_eventos TO service_role;

ALTER TABLE public.mp_webhook_eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only" ON public.mp_webhook_eventos FOR ALL USING (false) WITH CHECK (false);
