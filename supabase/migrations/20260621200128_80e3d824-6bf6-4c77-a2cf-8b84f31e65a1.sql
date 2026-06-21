
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE IF NOT EXISTS public.loja_categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  value text NOT NULL UNIQUE,
  label text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.loja_categorias TO anon, authenticated;
GRANT ALL ON public.loja_categorias TO service_role;

ALTER TABLE public.loja_categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categorias visíveis para todos"
  ON public.loja_categorias FOR SELECT USING (true);

CREATE POLICY "Super admin pode inserir categorias"
  ON public.loja_categorias FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin pode atualizar categorias"
  ON public.loja_categorias FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin pode excluir categorias"
  ON public.loja_categorias FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_loja_categorias_updated_at
  BEFORE UPDATE ON public.loja_categorias
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.loja_categorias (value, label, ordem) VALUES
  ('restaurante', 'Restaurante', 10),
  ('lanchonete', 'Lanchonete', 20),
  ('pizzaria', 'Pizzaria', 30),
  ('sorveteria', 'Sorveteria', 40),
  ('doceria', 'Doceria / Confeitaria', 50),
  ('padaria', 'Padaria', 60),
  ('acougue', 'Açougue / Carnes', 70),
  ('hortifruti', 'Hortifrúti / Verduras', 80),
  ('mercado', 'Mercado', 90),
  ('conveniencia', 'Loja de conveniência', 100),
  ('bebidas', 'Bebidas (distribuidora)', 110),
  ('farmacia', 'Farmácia', 120),
  ('pet_shop', 'Pet Shop', 130),
  ('auto_pecas', 'Auto Peças', 140),
  ('moto_pecas', 'Moto Peças', 150),
  ('roupas', 'Roupas / Moda', 160),
  ('calcados', 'Calçados', 170),
  ('material_construcao', 'Material de construção', 180),
  ('eletronicos', 'Eletrônicos', 190),
  ('floricultura', 'Floricultura', 200),
  ('livraria', 'Livraria / Papelaria', 210),
  ('outros', 'Outros', 9999)
ON CONFLICT (value) DO NOTHING;
