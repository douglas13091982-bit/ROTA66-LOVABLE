ALTER TABLE public.lojas
  ADD COLUMN IF NOT EXISTS catalogo_status_inicial text NOT NULL DEFAULT 'em_preparo';

ALTER TABLE public.lojas
  DROP CONSTRAINT IF EXISTS lojas_catalogo_status_inicial_check;

ALTER TABLE public.lojas
  ADD CONSTRAINT lojas_catalogo_status_inicial_check
  CHECK (catalogo_status_inicial IN ('em_preparo', 'pronto'));