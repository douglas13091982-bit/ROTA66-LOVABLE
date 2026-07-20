
CREATE TABLE public.promocoes_lojas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  city_id uuid REFERENCES public.cidades(id),
  cidade_nome text,
  title text NOT NULL,
  body text NOT NULL,
  url text,
  image_url text,
  created_by uuid NOT NULL,
  destinatarios integer NOT NULL DEFAULT 0,
  sent integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  erro text,
  created_at timestamptz NOT NULL DEFAULT now(),
  enviada_at timestamptz
);

GRANT SELECT, INSERT ON public.promocoes_lojas TO authenticated;
GRANT ALL ON public.promocoes_lojas TO service_role;

CREATE INDEX idx_promocoes_lojas_loja_recent ON public.promocoes_lojas(loja_id, created_at DESC);

ALTER TABLE public.promocoes_lojas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Loja vê suas próprias promoções"
  ON public.promocoes_lojas FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.lojas l WHERE l.id = loja_id AND l.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.loja_funcionarios f WHERE f.loja_id = promocoes_lojas.loja_id AND f.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Loja cria promoções próprias"
  ON public.promocoes_lojas FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      EXISTS (SELECT 1 FROM public.lojas l WHERE l.id = loja_id AND l.owner_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.loja_funcionarios f WHERE f.loja_id = promocoes_lojas.loja_id AND f.user_id = auth.uid())
      OR public.has_role(auth.uid(), 'super_admin')
    )
  );
