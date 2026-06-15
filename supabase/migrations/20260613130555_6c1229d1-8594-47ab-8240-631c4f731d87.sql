
ALTER TABLE public.config_roteirizacao
  ADD COLUMN IF NOT EXISTS catalogo_horizontal_min_produtos integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS catalogo_horizontal_min_categorias integer NOT NULL DEFAULT 5;

-- Permitir leitura pública (apenas leitura) para que o catálogo público use os limites
GRANT SELECT ON public.config_roteirizacao TO anon;

DROP POLICY IF EXISTS "Anon pode ler config" ON public.config_roteirizacao;
CREATE POLICY "Anon pode ler config" ON public.config_roteirizacao
  FOR SELECT TO anon USING (true);
