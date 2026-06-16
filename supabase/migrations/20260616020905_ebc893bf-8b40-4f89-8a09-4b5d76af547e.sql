
CREATE OR REPLACE FUNCTION public.trigger_reprocessar_ofertas_externas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.processar_ofertas_externas();
  RETURN NEW;
END;
$$;

-- Entregador online (heartbeat) — só dispara quando passa para online ou troca lat/lng pela primeira vez
DROP TRIGGER IF EXISTS trg_entregador_status_reprocessar ON public.entregador_status;
CREATE TRIGGER trg_entregador_status_reprocessar
AFTER INSERT OR UPDATE ON public.entregador_status
FOR EACH ROW
WHEN (NEW.online = true)
EXECUTE FUNCTION public.trigger_reprocessar_ofertas_externas();

-- Entregador aprovado
DROP TRIGGER IF EXISTS trg_status_conta_reprocessar ON public.entregador_status_conta;
CREATE TRIGGER trg_status_conta_reprocessar
AFTER INSERT OR UPDATE ON public.entregador_status_conta
FOR EACH ROW
WHEN (NEW.status = 'aprovado')
EXECUTE FUNCTION public.trigger_reprocessar_ofertas_externas();

-- Perfil ativou aceita_pedidos_externos
DROP TRIGGER IF EXISTS trg_profile_externos_reprocessar ON public.profiles;
CREATE TRIGGER trg_profile_externos_reprocessar
AFTER INSERT OR UPDATE OF aceita_pedidos_externos ON public.profiles
FOR EACH ROW
WHEN (NEW.aceita_pedidos_externos = true)
EXECUTE FUNCTION public.trigger_reprocessar_ofertas_externas();
