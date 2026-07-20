ALTER TABLE public.lojas
  ADD COLUMN IF NOT EXISTS bonus_entregador_ativo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bonus_entregador_valor numeric NOT NULL DEFAULT 0;