
-- 1) Adicionar área admin "contratos"
ALTER TYPE public.admin_area ADD VALUE IF NOT EXISTS 'contratos';

-- 2) Tabela contratos
CREATE TABLE IF NOT EXISTS public.contratos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL DEFAULT 'Termos de Uso',
  conteudo text NOT NULL,
  versao integer NOT NULL,
  ativo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (versao)
);

GRANT SELECT ON public.contratos TO anon, authenticated;
GRANT ALL ON public.contratos TO service_role;

ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contratos ativos são públicos"
  ON public.contratos FOR SELECT
  USING (ativo = true OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "Super admin insere contratos"
  ON public.contratos FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "Super admin atualiza contratos"
  ON public.contratos FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "Super admin remove contratos"
  ON public.contratos FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE TRIGGER trg_contratos_updated_at
  BEFORE UPDATE ON public.contratos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Garante somente 1 contrato ativo por vez
CREATE OR REPLACE FUNCTION public.contratos_unique_ativo()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.ativo = true THEN
    UPDATE public.contratos
       SET ativo = false, updated_at = now()
     WHERE id <> NEW.id AND ativo = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_contratos_unique_ativo
  AFTER INSERT OR UPDATE OF ativo ON public.contratos
  FOR EACH ROW WHEN (NEW.ativo = true)
  EXECUTE FUNCTION public.contratos_unique_ativo();

-- 3) Tabela de aceites
CREATE TABLE IF NOT EXISTS public.loja_aceites_contrato (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  contrato_id uuid NOT NULL REFERENCES public.contratos(id) ON DELETE RESTRICT,
  versao integer NOT NULL,
  aceito_em timestamptz NOT NULL DEFAULT now(),
  ip text,
  user_agent text,
  full_name_snapshot text,
  UNIQUE (loja_id, contrato_id)
);

CREATE INDEX IF NOT EXISTS idx_aceites_loja ON public.loja_aceites_contrato (loja_id);

GRANT SELECT, INSERT ON public.loja_aceites_contrato TO authenticated;
GRANT ALL ON public.loja_aceites_contrato TO service_role;

ALTER TABLE public.loja_aceites_contrato ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Loja vê seus aceites"
  ON public.loja_aceites_contrato FOR SELECT
  TO authenticated
  USING (
    public.is_loja_owner(auth.uid(), loja_id)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

CREATE POLICY "Loja registra aceite"
  ON public.loja_aceites_contrato FOR INSERT
  TO authenticated
  WITH CHECK (public.is_loja_owner(auth.uid(), loja_id));

-- 4) Helper: contrato ativo (público)
CREATE OR REPLACE FUNCTION public.contrato_ativo()
RETURNS TABLE(id uuid, titulo text, conteudo text, versao integer, atualizado_em timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id, titulo, conteudo, versao, updated_at
    FROM public.contratos
   WHERE ativo = true
   ORDER BY versao DESC
   LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.contrato_ativo() TO anon, authenticated;

-- 5) Helper: loja precisa aceitar contrato vigente?
CREATE OR REPLACE FUNCTION public.loja_precisa_aceitar_contrato(_loja_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.contratos c
     WHERE c.ativo = true
       AND NOT EXISTS (
         SELECT 1 FROM public.loja_aceites_contrato a
          WHERE a.loja_id = _loja_id AND a.contrato_id = c.id
       )
  );
$$;

GRANT EXECUTE ON FUNCTION public.loja_precisa_aceitar_contrato(uuid) TO authenticated;
