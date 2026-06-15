
-- Nova tabela de cobranças do entregador
CREATE TABLE IF NOT EXISTS public.cobrancas_entregador (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entregador_id uuid NOT NULL,
  pedido_id uuid NOT NULL UNIQUE,
  valor numeric NOT NULL,
  vencimento timestamptz NOT NULL,
  pago boolean NOT NULL DEFAULT false,
  pago_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cobrancas_entregador TO authenticated;
GRANT ALL ON public.cobrancas_entregador TO service_role;

ALTER TABLE public.cobrancas_entregador ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Entregador vê suas cobranças"
  ON public.cobrancas_entregador FOR SELECT TO authenticated
  USING (auth.uid() = entregador_id);

CREATE POLICY "Super admin gerencia cobranças entregador"
  ON public.cobrancas_entregador FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER trg_cobrancas_entregador_updated
  BEFORE UPDATE ON public.cobrancas_entregador
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Remove gatilho antigo (cobrança da loja por pedido)
DROP TRIGGER IF EXISTS trg_pedidos_gerar_cobranca ON public.pedidos;
DROP FUNCTION IF EXISTS public.gerar_cobranca_pedido_entregue();

-- Nova função: gera cobrança para o ENTREGADOR ao entregar
CREATE OR REPLACE FUNCTION public.gerar_cobranca_entregador_pedido_entregue()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _taxa numeric;
  _prazo integer;
BEGIN
  IF NEW.status = 'entregue'::pedido_status
     AND (OLD.status IS DISTINCT FROM NEW.status)
     AND NEW.entregador_id IS NOT NULL THEN
    SELECT taxa_por_pedido, prazo_pagamento_dias
      INTO _taxa, _prazo
      FROM public.config_financeiro
      WHERE singleton = true
      LIMIT 1;
    IF _taxa IS NULL THEN _taxa := 2.00; END IF;
    IF _prazo IS NULL THEN _prazo := 30; END IF;
    INSERT INTO public.cobrancas_entregador (entregador_id, pedido_id, valor, vencimento)
    VALUES (NEW.entregador_id, NEW.id, _taxa, now() + make_interval(days => _prazo))
    ON CONFLICT (pedido_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pedidos_gerar_cobranca_entregador
  AFTER UPDATE ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.gerar_cobranca_entregador_pedido_entregue();
