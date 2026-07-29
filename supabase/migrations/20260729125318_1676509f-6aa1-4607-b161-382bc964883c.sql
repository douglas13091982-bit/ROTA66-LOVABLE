ALTER TABLE public.lojas
  ADD COLUMN IF NOT EXISTS criado_por uuid,
  ADD COLUMN IF NOT EXISTS criado_por_tipo text NOT NULL DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS criado_por_nome text;

COMMENT ON COLUMN public.lojas.criado_por_tipo IS 'auto | super_admin | franqueado | colaborador';