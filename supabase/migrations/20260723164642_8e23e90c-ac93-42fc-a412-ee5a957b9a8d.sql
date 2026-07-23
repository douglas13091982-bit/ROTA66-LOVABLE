
ALTER TABLE public.franqueado_despesas
  ADD COLUMN IF NOT EXISTS recorrente boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recorrencia_id uuid;

CREATE INDEX IF NOT EXISTS idx_franqueado_despesas_recorrencia
  ON public.franqueado_despesas(recorrencia_id) WHERE recorrencia_id IS NOT NULL;
