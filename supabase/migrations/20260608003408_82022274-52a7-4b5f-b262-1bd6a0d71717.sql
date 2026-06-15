
-- 1. Adicionar colunas à tabela lojas
ALTER TABLE public.lojas
  ADD COLUMN IF NOT EXISTS catalogo_ativo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS catalogo_slug text;

-- Preencher catalogo_slug a partir de slug existente
UPDATE public.lojas SET catalogo_slug = slug WHERE catalogo_slug IS NULL;

-- Tornar unique (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS lojas_catalogo_slug_unique ON public.lojas (lower(catalogo_slug));

-- 2. Trigger guard: dono não pode alterar campos restritos
CREATE OR REPLACE FUNCTION public.lojas_update_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RETURN NEW; END IF;
  IF public.has_role(_uid, 'super_admin'::app_role) THEN RETURN NEW; END IF;

  IF NEW.catalogo_ativo IS DISTINCT FROM OLD.catalogo_ativo
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.plano_mensal_ativo IS DISTINCT FROM OLD.plano_mensal_ativo
     OR NEW.mensalidade_valor IS DISTINCT FROM OLD.mensalidade_valor
     OR NEW.dia_vencimento_mensalidade IS DISTINCT FROM OLD.dia_vencimento_mensalidade THEN
    RAISE EXCEPTION 'Apenas super_admin pode alterar este campo';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lojas_update_guard ON public.lojas;
CREATE TRIGGER trg_lojas_update_guard
  BEFORE UPDATE ON public.lojas
  FOR EACH ROW EXECUTE FUNCTION public.lojas_update_guard();

-- Permitir leitura pública das lojas com catálogo ativo (necessário para a página /c/$slug)
DROP POLICY IF EXISTS "Lojas com catalogo ativo sao publicas" ON public.lojas;
CREATE POLICY "Lojas com catalogo ativo sao publicas"
  ON public.lojas FOR SELECT TO anon, authenticated
  USING (ativa = true AND status = 'aprovado'::status_moderacao AND catalogo_ativo = true);

-- 3. Tabela produtos
CREATE TABLE IF NOT EXISTS public.produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL,
  nome text NOT NULL,
  descricao text,
  preco numeric NOT NULL DEFAULT 0 CHECK (preco >= 0),
  imagem_url text,
  categoria text,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  estoque_ilimitado boolean NOT NULL DEFAULT true,
  estoque integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS produtos_loja_id_idx ON public.produtos (loja_id);
CREATE INDEX IF NOT EXISTS produtos_loja_ativo_ordem_idx ON public.produtos (loja_id, ativo, ordem);

GRANT SELECT ON public.produtos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.produtos TO authenticated;
GRANT ALL ON public.produtos TO service_role;

ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dono gerencia seus produtos"
  ON public.produtos FOR ALL TO authenticated
  USING (public.is_loja_owner(auth.uid(), loja_id))
  WITH CHECK (public.is_loja_owner(auth.uid(), loja_id));

CREATE POLICY "Super admin gerencia produtos"
  ON public.produtos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Publico ve produtos de loja com catalogo ativo"
  ON public.produtos FOR SELECT TO anon, authenticated
  USING (
    ativo = true
    AND EXISTS (
      SELECT 1 FROM public.lojas l
      WHERE l.id = produtos.loja_id
        AND l.ativa = true
        AND l.status = 'aprovado'::status_moderacao
        AND l.catalogo_ativo = true
    )
  );

CREATE TRIGGER trg_produtos_updated_at
  BEFORE UPDATE ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
