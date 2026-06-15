
CREATE OR REPLACE FUNCTION public.sync_agendamento_from_pedido()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Sincroniza atribuição do entregador
  IF NEW.entregador_id IS DISTINCT FROM OLD.entregador_id AND NEW.entregador_id IS NOT NULL THEN
    UPDATE public.agendamentos
       SET entregador_id = NEW.entregador_id,
           status = CASE WHEN status = 'publicado' THEN 'aceito' ELSE status END,
           aceito_em = COALESCE(aceito_em, now())
     WHERE pedido_id = NEW.id;
  END IF;

  -- Sincroniza entrega
  IF NEW.status = 'entregue'::pedido_status AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE public.agendamentos
       SET status = 'entregue'
     WHERE pedido_id = NEW.id;
  END IF;

  -- Sincroniza cancelamento
  IF NEW.status = 'cancelado'::pedido_status AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE public.agendamentos
       SET status = 'cancelado'
     WHERE pedido_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER pedidos_sync_agendamento
  AFTER UPDATE ON public.pedidos
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_agendamento_from_pedido();
