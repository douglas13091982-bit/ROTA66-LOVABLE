CREATE TABLE IF NOT EXISTS public.config_roteirizacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  max_detour_seconds integer NOT NULL DEFAULT 900,
  max_detour_meters integer NOT NULL DEFAULT 3000,
  max_paradas_por_rota integer NOT NULL DEFAULT 6,
  entregador_online_ttl_min integer NOT NULL DEFAULT 10,
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.config_roteirizacao TO authenticated;
GRANT ALL ON public.config_roteirizacao TO service_role;

ALTER TABLE public.config_roteirizacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos autenticados leem config" ON public.config_roteirizacao
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admin gerencia config" ON public.config_roteirizacao
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER config_roteirizacao_updated_at
  BEFORE UPDATE ON public.config_roteirizacao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

INSERT INTO public.config_roteirizacao (singleton) VALUES (true)
  ON CONFLICT (singleton) DO NOTHING;