CREATE TABLE public.config_notificacao_som (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  ativo boolean NOT NULL DEFAULT true,
  volume numeric NOT NULL DEFAULT 0.6,
  frequencia_inicial integer NOT NULL DEFAULT 880,
  frequencia_final integer NOT NULL DEFAULT 440,
  duracao_ms integer NOT NULL DEFAULT 300,
  repeticoes integer NOT NULL DEFAULT 1,
  intervalo_ms integer NOT NULL DEFAULT 250,
  tipo_onda text NOT NULL DEFAULT 'sine',
  vibrar boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.config_notificacao_som TO authenticated;
GRANT ALL ON public.config_notificacao_som TO service_role;

ALTER TABLE public.config_notificacao_som ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos autenticados leem config som"
  ON public.config_notificacao_som FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admin gerencia config som"
  ON public.config_notificacao_som FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE OR REPLACE FUNCTION public.set_updated_at_config_notif_som()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_config_notif_som_updated_at
  BEFORE UPDATE ON public.config_notificacao_som
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_config_notif_som();

INSERT INTO public.config_notificacao_som (singleton) VALUES (true) ON CONFLICT DO NOTHING;