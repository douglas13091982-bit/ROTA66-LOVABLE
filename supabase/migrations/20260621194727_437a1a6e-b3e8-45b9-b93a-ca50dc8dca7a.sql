CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.loja_avaliacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  cliente_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pedido_id UUID REFERENCES public.pedidos(id) ON DELETE SET NULL,
  nota SMALLINT NOT NULL CHECK (nota >= 1 AND nota <= 5),
  comentario TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (loja_id, cliente_user_id)
);

CREATE INDEX idx_loja_avaliacoes_loja ON public.loja_avaliacoes(loja_id);
CREATE INDEX idx_loja_avaliacoes_cliente ON public.loja_avaliacoes(cliente_user_id);

GRANT SELECT ON public.loja_avaliacoes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loja_avaliacoes TO authenticated;
GRANT ALL ON public.loja_avaliacoes TO service_role;

ALTER TABLE public.loja_avaliacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Avaliações são públicas para leitura"
  ON public.loja_avaliacoes FOR SELECT
  USING (true);

CREATE POLICY "Cliente cria sua avaliação"
  ON public.loja_avaliacoes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = cliente_user_id);

CREATE POLICY "Cliente atualiza sua avaliação"
  ON public.loja_avaliacoes FOR UPDATE
  TO authenticated
  USING (auth.uid() = cliente_user_id)
  WITH CHECK (auth.uid() = cliente_user_id);

CREATE POLICY "Cliente apaga sua avaliação"
  ON public.loja_avaliacoes FOR DELETE
  TO authenticated
  USING (auth.uid() = cliente_user_id);

CREATE TRIGGER set_loja_avaliacoes_updated_at
  BEFORE UPDATE ON public.loja_avaliacoes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();