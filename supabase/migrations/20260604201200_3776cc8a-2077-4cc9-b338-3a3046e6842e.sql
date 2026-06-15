ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS entrega_paga boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS entrega_paga_em timestamptz;