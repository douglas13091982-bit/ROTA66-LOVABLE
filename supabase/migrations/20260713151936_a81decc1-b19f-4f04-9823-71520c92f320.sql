ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS is_teste boolean NOT NULL DEFAULT false;
UPDATE public.lojas SET is_teste = true WHERE id = '3b05b069-ac20-4c10-87c9-2dde2977a9ae';