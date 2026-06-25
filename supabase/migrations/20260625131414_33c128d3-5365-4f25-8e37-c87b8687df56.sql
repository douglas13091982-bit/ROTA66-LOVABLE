CREATE INDEX IF NOT EXISTS idx_anuncios_entregador_ativo_ordem
  ON public.anuncios_entregador (ativo, ordem ASC, created_at DESC);