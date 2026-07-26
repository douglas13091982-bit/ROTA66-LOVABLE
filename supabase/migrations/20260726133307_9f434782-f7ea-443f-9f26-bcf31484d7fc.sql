CREATE OR REPLACE FUNCTION public.tg_rastreio_broadcast()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.chegou_entrega_at IS DISTINCT FROM OLD.chegou_entrega_at
     OR NEW.entrega_confirmada_em IS DISTINCT FROM OLD.entrega_confirmada_em
     OR NEW.codigo_entrega IS DISTINCT FROM OLD.codigo_entrega THEN
    PERFORM realtime.send(
      jsonb_build_object(
        'pedido_id', NEW.id,
        'status', NEW.status,
        'chegou', NEW.chegou_entrega_at IS NOT NULL
      ),
      'rastreio_update',
      'rastreio:' || NEW.id::text,
      false
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rastreio_broadcast ON public.pedidos;
CREATE TRIGGER trg_rastreio_broadcast
AFTER UPDATE ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION public.tg_rastreio_broadcast();