
CREATE TABLE public.produto_adicional_grupos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  obrigatorio BOOLEAN NOT NULL DEFAULT false,
  min_escolhas INT NOT NULL DEFAULT 0,
  max_escolhas INT NOT NULL DEFAULT 1,
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.produto_adicional_grupos (produto_id, ordem);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.produto_adicional_grupos TO authenticated;
GRANT SELECT ON public.produto_adicional_grupos TO anon;
GRANT ALL ON public.produto_adicional_grupos TO service_role;

ALTER TABLE public.produto_adicional_grupos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "adicional_grupos_public_read"
  ON public.produto_adicional_grupos FOR SELECT USING (true);

CREATE POLICY "adicional_grupos_owner_manage"
  ON public.produto_adicional_grupos FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.produtos p
    JOIN public.lojas l ON l.id = p.loja_id
    WHERE p.id = produto_adicional_grupos.produto_id
      AND (
        l.owner_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'super_admin')
        OR EXISTS (
          SELECT 1 FROM public.loja_funcionarios lf
          WHERE lf.loja_id = l.id AND lf.user_id = auth.uid()
        )
      )
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.produtos p
    JOIN public.lojas l ON l.id = p.loja_id
    WHERE p.id = produto_adicional_grupos.produto_id
      AND (
        l.owner_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'super_admin')
        OR EXISTS (
          SELECT 1 FROM public.loja_funcionarios lf
          WHERE lf.loja_id = l.id AND lf.user_id = auth.uid()
        )
      )
  ));

CREATE TRIGGER trg_adicional_grupos_updated
  BEFORE UPDATE ON public.produto_adicional_grupos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE public.produto_adicional_opcoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  grupo_id UUID NOT NULL REFERENCES public.produto_adicional_grupos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  preco NUMERIC(10,2) NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.produto_adicional_opcoes (grupo_id, ordem);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.produto_adicional_opcoes TO authenticated;
GRANT SELECT ON public.produto_adicional_opcoes TO anon;
GRANT ALL ON public.produto_adicional_opcoes TO service_role;

ALTER TABLE public.produto_adicional_opcoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "adicional_opcoes_public_read"
  ON public.produto_adicional_opcoes FOR SELECT USING (true);

CREATE POLICY "adicional_opcoes_owner_manage"
  ON public.produto_adicional_opcoes FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.produto_adicional_grupos g
    JOIN public.produtos p ON p.id = g.produto_id
    JOIN public.lojas l ON l.id = p.loja_id
    WHERE g.id = produto_adicional_opcoes.grupo_id
      AND (
        l.owner_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'super_admin')
        OR EXISTS (
          SELECT 1 FROM public.loja_funcionarios lf
          WHERE lf.loja_id = l.id AND lf.user_id = auth.uid()
        )
      )
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.produto_adicional_grupos g
    JOIN public.produtos p ON p.id = g.produto_id
    JOIN public.lojas l ON l.id = p.loja_id
    WHERE g.id = produto_adicional_opcoes.grupo_id
      AND (
        l.owner_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'super_admin')
        OR EXISTS (
          SELECT 1 FROM public.loja_funcionarios lf
          WHERE lf.loja_id = l.id AND lf.user_id = auth.uid()
        )
      )
  ));

CREATE TRIGGER trg_adicional_opcoes_updated
  BEFORE UPDATE ON public.produto_adicional_opcoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
