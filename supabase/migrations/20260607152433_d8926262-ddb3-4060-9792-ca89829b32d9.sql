
CREATE TABLE public.anuncios_entregador (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text,
  image_data_url text NOT NULL,
  link_url text,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.anuncios_entregador TO authenticated;
GRANT ALL ON public.anuncios_entregador TO service_role;

ALTER TABLE public.anuncios_entregador ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados veem anuncios ativos"
  ON public.anuncios_entregador FOR SELECT
  TO authenticated
  USING (ativo = true OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admin gerencia anuncios entregador"
  ON public.anuncios_entregador FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER update_anuncios_entregador_updated_at
  BEFORE UPDATE ON public.anuncios_entregador
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
