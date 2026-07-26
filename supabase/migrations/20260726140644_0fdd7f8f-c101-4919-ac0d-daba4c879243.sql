CREATE OR REPLACE FUNCTION public.desvincular_pedidos_turno_encerrado(_agendamento_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _n integer := 0;
BEGIN
  UPDATE public.pedidos
     SET agendamento_id = NULL,
         taxa_turno_entregador = NULL
   WHERE agendamento_id = _agendamento_id
     AND status <> 'entregue'::pedido_status;
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_agendamento_encerrado_reverter_taxa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('concluido','cancelado')
     AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.desvincular_pedidos_turno_encerrado(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_agendamento_encerrado_reverter_taxa ON public.agendamentos;
CREATE TRIGGER trg_agendamento_encerrado_reverter_taxa
AFTER UPDATE OF status ON public.agendamentos
FOR EACH ROW
EXECUTE FUNCTION public.tg_agendamento_encerrado_reverter_taxa();