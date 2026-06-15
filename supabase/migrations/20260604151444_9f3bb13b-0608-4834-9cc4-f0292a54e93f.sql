
CREATE TYPE public.tipo_veiculo AS ENUM ('moto','carro','caminhonete');

CREATE TABLE public.tarifas_globais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_veiculo public.tipo_veiculo NOT NULL,
  faixa_km_min NUMERIC(6,2) NOT NULL DEFAULT 0,
  faixa_km_max NUMERIC(6,2) NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  ativa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tarifas_veiculo ON public.tarifas_globais(tipo_veiculo);

GRANT SELECT ON public.tarifas_globais TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.tarifas_globais TO authenticated;
GRANT ALL ON public.tarifas_globais TO service_role;

ALTER TABLE public.tarifas_globais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tarifas ativas são visíveis" ON public.tarifas_globais
  FOR SELECT TO authenticated, anon USING (ativa = true);

CREATE POLICY "Super admin vê todas tarifas" ON public.tarifas_globais
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin gerencia tarifas" ON public.tarifas_globais
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_tarifas_updated_at BEFORE UPDATE ON public.tarifas_globais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Permitir super admin ver TODOS os profiles (para painel)
CREATE POLICY "Super admin vê todos profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
