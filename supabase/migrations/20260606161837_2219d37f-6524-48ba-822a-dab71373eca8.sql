
-- 1. Flag de plano mensal na tabela lojas
ALTER TABLE public.lojas
  ADD COLUMN IF NOT EXISTS plano_mensal_ativo boolean NOT NULL DEFAULT false;

-- 2. Nova tabela de tarifas por loja
CREATE TABLE IF NOT EXISTS public.tarifas_loja (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  faixa_km_min numeric NOT NULL DEFAULT 0,
  faixa_km_max numeric NOT NULL,
  valor numeric NOT NULL,
  valor_minimo numeric NOT NULL DEFAULT 0,
  valor_por_km numeric NOT NULL DEFAULT 0,
  tipo_veiculo tipo_veiculo NOT NULL DEFAULT 'moto'::tipo_veiculo,
  ativa boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tarifas_loja_loja_idx ON public.tarifas_loja (loja_id, ativa);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tarifas_loja TO authenticated;
GRANT SELECT ON public.tarifas_loja TO anon;
GRANT ALL ON public.tarifas_loja TO service_role;

ALTER TABLE public.tarifas_loja ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tarifas loja ativas são visíveis"
  ON public.tarifas_loja FOR SELECT TO anon, authenticated
  USING (ativa = true);

CREATE POLICY "Super admin vê todas tarifas loja"
  ON public.tarifas_loja FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admin gerencia tarifas loja"
  ON public.tarifas_loja FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Dono da loja vê suas tarifas"
  ON public.tarifas_loja FOR SELECT TO authenticated
  USING (is_loja_owner(auth.uid(), loja_id));

CREATE TRIGGER trg_tarifas_loja_updated_at
  BEFORE UPDATE ON public.tarifas_loja
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 3. Atualiza trigger de cobrança para pular lojas com plano mensal ativo
CREATE OR REPLACE FUNCTION public.gerar_cobranca_pedido_entregue()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _taxa numeric;
  _prazo integer;
  _plano boolean;
BEGIN
  IF NEW.status = 'entregue'::pedido_status
     AND (OLD.status IS DISTINCT FROM NEW.status) THEN

    -- Loja com plano mensal ativo: não cobra taxa por pedido
    SELECT plano_mensal_ativo INTO _plano
      FROM public.lojas WHERE id = NEW.loja_id;
    IF COALESCE(_plano, false) = true THEN
      RETURN NEW;
    END IF;

    SELECT taxa_por_pedido, prazo_pagamento_dias
      INTO _taxa, _prazo
      FROM public.config_financeiro
      WHERE singleton = true
      LIMIT 1;
    IF _taxa IS NULL THEN _taxa := 2.00; END IF;
    IF _prazo IS NULL THEN _prazo := 30; END IF;

    INSERT INTO public.cobrancas_loja (loja_id, pedido_id, valor, vencimento)
    VALUES (NEW.loja_id, NEW.id, _taxa, now() + make_interval(days => _prazo))
    ON CONFLICT (pedido_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
