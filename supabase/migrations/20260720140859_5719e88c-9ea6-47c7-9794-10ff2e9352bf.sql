ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS preco_promocional_ate timestamptz;
ALTER TABLE public.promocoes_lojas ADD COLUMN IF NOT EXISTS valido_ate timestamptz;
CREATE INDEX IF NOT EXISTS idx_produtos_preco_promo_ate ON public.produtos(preco_promocional_ate) WHERE preco_promocional IS NOT NULL;