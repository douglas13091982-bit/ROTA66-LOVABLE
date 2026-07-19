
-- Trigger: quando um pedido pendente marcado como avulso_motoboy é materializado,
-- promove o pedido resultante direto para status 'pronto' (pula 'em_preparo'),
-- assim ele já entra no pool de entregadores.
CREATE OR REPLACE FUNCTION public.tg_avulso_motoboy_promover_pronto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.pedido_id IS NOT NULL
     AND (OLD.pedido_id IS NULL OR OLD.pedido_id IS DISTINCT FROM NEW.pedido_id)
     AND COALESCE((NEW.dados->>'avulso_motoboy')::boolean, false) IS TRUE
  THEN
    UPDATE public.pedidos
       SET status = 'pronto'::public.pedido_status
     WHERE id = NEW.pedido_id
       AND status = 'em_preparo'::public.pedido_status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_avulso_motoboy_promover_pronto ON public.pedidos_pendentes_pagamento;
CREATE TRIGGER trg_avulso_motoboy_promover_pronto
AFTER UPDATE ON public.pedidos_pendentes_pagamento
FOR EACH ROW
EXECUTE FUNCTION public.tg_avulso_motoboy_promover_pronto();
