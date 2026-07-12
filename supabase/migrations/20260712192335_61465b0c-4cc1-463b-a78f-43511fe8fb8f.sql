
CREATE OR REPLACE FUNCTION public.expirar_ofertas_ao_cancelar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status::text = 'cancelado'
     AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    UPDATE public.pedido_ofertas
       SET status = 'expirado'
     WHERE pedido_id = NEW.id
       AND status = 'ativo';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_expirar_ofertas_ao_cancelar ON public.pedidos;
CREATE TRIGGER trg_expirar_ofertas_ao_cancelar
AFTER UPDATE ON public.pedidos
FOR EACH ROW
EXECUTE FUNCTION public.expirar_ofertas_ao_cancelar();

-- Remove trigger duplicado (havia dois disparando a mesma função)
DROP TRIGGER IF EXISTS pedidos_entregador_update_guard ON public.pedidos;
DROP TRIGGER IF EXISTS trg_processar_ofertas ON public.pedidos;
