ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS endereco_lat double precision,
  ADD COLUMN IF NOT EXISTS endereco_lng double precision;