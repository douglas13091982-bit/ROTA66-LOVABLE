
-- 1. Tabela planos_loja
CREATE TABLE public.planos_loja (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  mensalidade_valor numeric NOT NULL DEFAULT 0,
  taxa_por_pedido numeric NOT NULL DEFAULT 0,
  dia_vencimento integer NOT NULL DEFAULT 10 CHECK (dia_vencimento BETWEEN 1 AND 28),
  destaque boolean NOT NULL DEFAULT false,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.planos_loja TO anon, authenticated;
GRANT ALL ON public.planos_loja TO service_role;

ALTER TABLE public.planos_loja ENABLE ROW LEVEL SECURITY;

CREATE POLICY "planos visíveis para todos quando ativos"
  ON public.planos_loja FOR SELECT
  USING (ativo = true OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "super_admin gerencia planos"
  ON public.planos_loja FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE TRIGGER trg_planos_loja_updated_at
  BEFORE UPDATE ON public.planos_loja
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 2. Coluna plano_id em lojas
ALTER TABLE public.lojas
  ADD COLUMN IF NOT EXISTS plano_id uuid REFERENCES public.planos_loja(id) ON DELETE SET NULL;

-- 3. Trigger: aplicar plano na loja
CREATE OR REPLACE FUNCTION public.aplicar_plano_loja()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _p public.planos_loja%ROWTYPE;
BEGIN
  IF NEW.plano_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.plano_id IS NOT DISTINCT FROM OLD.plano_id THEN
    RETURN NEW;
  END IF;
  SELECT * INTO _p FROM public.planos_loja WHERE id = NEW.plano_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  NEW.mensalidade_valor := _p.mensalidade_valor;
  NEW.dia_vencimento_mensalidade := _p.dia_vencimento;
  NEW.plano_mensal_ativo := (_p.taxa_por_pedido = 0);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_aplicar_plano_loja ON public.lojas;
CREATE TRIGGER trg_aplicar_plano_loja
  BEFORE INSERT OR UPDATE OF plano_id ON public.lojas
  FOR EACH ROW EXECUTE FUNCTION public.aplicar_plano_loja();

-- 4. Atualizar guard de lojas: permitir owner setar plano_id apenas se ainda for NULL
CREATE OR REPLACE FUNCTION public.lojas_update_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RETURN NEW; END IF;
  IF public.has_role(_uid, 'super_admin'::app_role) THEN RETURN NEW; END IF;

  -- Owner pode escolher o plano apenas se ainda não houver um
  IF NEW.plano_id IS DISTINCT FROM OLD.plano_id THEN
    IF OLD.plano_id IS NOT NULL THEN
      RAISE EXCEPTION 'Apenas super_admin pode trocar o plano da loja';
    END IF;
  END IF;

  IF NEW.catalogo_ativo IS DISTINCT FROM OLD.catalogo_ativo
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.plano_mensal_ativo IS DISTINCT FROM OLD.plano_mensal_ativo
     OR NEW.mensalidade_valor IS DISTINCT FROM OLD.mensalidade_valor
     OR NEW.dia_vencimento_mensalidade IS DISTINCT FROM OLD.dia_vencimento_mensalidade THEN
    -- Permite quando vier de uma atribuição de plano_id (trigger aplicar_plano_loja)
    IF NEW.plano_id IS DISTINCT FROM OLD.plano_id THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Apenas super_admin pode alterar este campo';
  END IF;

  RETURN NEW;
END;
$function$;

-- 5. Seed inicial
INSERT INTO public.planos_loja (nome, descricao, mensalidade_valor, taxa_por_pedido, dia_vencimento, destaque, ordem, ativo)
VALUES
  ('Básico', 'Sem mensalidade. Você paga uma taxa por pedido entregue.', 0, 2, 10, false, 1, true),
  ('Pro', 'Mensalidade reduzida e taxa menor por pedido. Recomendado para volume médio.', 99, 1, 10, true, 2, true),
  ('Premium', 'Sem taxa por pedido. Ideal para alto volume de entregas.', 199, 0, 10, false, 3, true);
