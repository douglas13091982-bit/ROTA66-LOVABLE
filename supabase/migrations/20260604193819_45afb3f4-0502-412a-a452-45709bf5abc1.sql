
-- Configuração financeira global
CREATE TABLE public.config_financeiro (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true,
  taxa_por_pedido numeric NOT NULL DEFAULT 2.00,
  prazo_pagamento_dias integer NOT NULL DEFAULT 30,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT config_financeiro_singleton_unique UNIQUE (singleton)
);

GRANT SELECT ON public.config_financeiro TO authenticated;
GRANT ALL ON public.config_financeiro TO service_role;

ALTER TABLE public.config_financeiro ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos autenticados leem config financeiro"
  ON public.config_financeiro FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admin gerencia config financeiro"
  ON public.config_financeiro FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER trg_config_financeiro_updated_at
  BEFORE UPDATE ON public.config_financeiro
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

INSERT INTO public.config_financeiro (singleton, taxa_por_pedido, prazo_pagamento_dias)
VALUES (true, 2.00, 30);

-- Cobranças por loja (uma por pedido entregue)
CREATE TABLE public.cobrancas_loja (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL,
  pedido_id uuid NOT NULL UNIQUE,
  valor numeric NOT NULL,
  vencimento timestamptz NOT NULL,
  pago boolean NOT NULL DEFAULT false,
  pago_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX cobrancas_loja_loja_idx ON public.cobrancas_loja (loja_id, pago);

GRANT SELECT ON public.cobrancas_loja TO authenticated;
GRANT ALL ON public.cobrancas_loja TO service_role;

ALTER TABLE public.cobrancas_loja ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dono da loja vê cobranças"
  ON public.cobrancas_loja FOR SELECT TO authenticated
  USING (is_loja_owner(auth.uid(), loja_id));

CREATE POLICY "Super admin vê todas cobranças"
  ON public.cobrancas_loja FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admin gerencia cobranças"
  ON public.cobrancas_loja FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER trg_cobrancas_loja_updated_at
  BEFORE UPDATE ON public.cobrancas_loja
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Trigger: ao marcar pedido como 'entregue', gera cobrança para a loja
CREATE OR REPLACE FUNCTION public.gerar_cobranca_pedido_entregue()
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
     AND (OLD.status IS DISTINCT FROM NEW.status) THEN
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

CREATE TRIGGER trg_pedidos_gerar_cobranca
  AFTER UPDATE ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.gerar_cobranca_pedido_entregue();
