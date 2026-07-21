
CREATE TABLE public.franqueado_socios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  franqueado_user_id uuid NOT NULL,
  nome text NOT NULL,
  percentual numeric(5,2) NOT NULL DEFAULT 0,
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_franqueado_socios_user ON public.franqueado_socios(franqueado_user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.franqueado_socios TO authenticated;
GRANT ALL ON public.franqueado_socios TO service_role;
ALTER TABLE public.franqueado_socios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "franqueado_socios acesso"
ON public.franqueado_socios
FOR ALL
TO authenticated
USING (
  franqueado_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.franqueado_colaboradores fc
    WHERE fc.franqueado_user_id = franqueado_socios.franqueado_user_id
      AND fc.colaborador_user_id = auth.uid()
      AND fc.ativo = true
  )
)
WITH CHECK (
  franqueado_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.franqueado_colaboradores fc
    WHERE fc.franqueado_user_id = franqueado_socios.franqueado_user_id
      AND fc.colaborador_user_id = auth.uid()
      AND fc.ativo = true
  )
);

CREATE TRIGGER trg_franqueado_socios_updated_at
BEFORE UPDATE ON public.franqueado_socios
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE public.franqueado_despesas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  franqueado_user_id uuid NOT NULL,
  descricao text NOT NULL,
  categoria text,
  tipo text NOT NULL DEFAULT 'despesa' CHECK (tipo IN ('despesa','investimento')),
  valor numeric(12,2) NOT NULL DEFAULT 0,
  competencia text NOT NULL,
  pago boolean NOT NULL DEFAULT false,
  observacao text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_franqueado_despesas_user_comp ON public.franqueado_despesas(franqueado_user_id, competencia DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.franqueado_despesas TO authenticated;
GRANT ALL ON public.franqueado_despesas TO service_role;
ALTER TABLE public.franqueado_despesas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "franqueado_despesas acesso"
ON public.franqueado_despesas
FOR ALL
TO authenticated
USING (
  franqueado_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.franqueado_colaboradores fc
    WHERE fc.franqueado_user_id = franqueado_despesas.franqueado_user_id
      AND fc.colaborador_user_id = auth.uid()
      AND fc.ativo = true
  )
)
WITH CHECK (
  franqueado_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.franqueado_colaboradores fc
    WHERE fc.franqueado_user_id = franqueado_despesas.franqueado_user_id
      AND fc.colaborador_user_id = auth.uid()
      AND fc.ativo = true
  )
);

CREATE TRIGGER trg_franqueado_despesas_updated_at
BEFORE UPDATE ON public.franqueado_despesas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
