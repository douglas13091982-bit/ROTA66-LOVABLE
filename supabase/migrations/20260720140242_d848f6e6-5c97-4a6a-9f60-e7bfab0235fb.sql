ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS preco_promocional numeric(10,2);
ALTER TABLE public.promocoes_lojas ADD COLUMN IF NOT EXISTS produto_id uuid REFERENCES public.produtos(id) ON DELETE SET NULL;
ALTER TABLE public.promocoes_lojas ADD COLUMN IF NOT EXISTS preco_promocional numeric(10,2);