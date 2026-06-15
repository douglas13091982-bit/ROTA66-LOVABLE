
-- Reverte: remove cobrança do entregador
DROP TRIGGER IF EXISTS trg_pedidos_gerar_cobranca_entregador ON public.pedidos;
DROP FUNCTION IF EXISTS public.gerar_cobranca_entregador_pedido_entregue();
DROP TABLE IF EXISTS public.cobrancas_entregador;

-- Recria gatilho de cobrança para a LOJA
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

DROP TRIGGER IF EXISTS trg_pedidos_gerar_cobranca ON public.pedidos;
CREATE TRIGGER trg_pedidos_gerar_cobranca
  AFTER UPDATE ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.gerar_cobranca_pedido_entregue();
