ALTER TABLE public.lojas
  ADD COLUMN IF NOT EXISTS endereco_lat numeric,
  ADD COLUMN IF NOT EXISTS endereco_lng numeric;