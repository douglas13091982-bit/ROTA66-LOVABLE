ALTER TABLE public.config_financeiro
  ADD COLUMN IF NOT EXISTS retorno_cartao_valor_por_km numeric NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.get_retorno_cartao_por_km()
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(retorno_cartao_valor_por_km, 0)
  FROM public.config_financeiro
  WHERE singleton = true
  LIMIT 1;
$function$;

GRANT EXECUTE ON FUNCTION public.get_retorno_cartao_por_km() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.processar_saldos_pedido_entregue()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _frete_entregador numeric;
  _taxa_entregador numeric;
BEGIN
  IF NEW.status = 'entregue'::pedido_status
     AND (OLD.status IS DISTINCT FROM NEW.status)
     AND NEW.entregador_id IS NOT NULL THEN

    IF NEW.agendamento_id IS NOT NULL THEN
      -- Pedido de turno agendado: entregador recebe a taxa por entrega
      -- definida no turno (as horas são pagas na conclusão do turno).
      _frete_entregador := GREATEST(COALESCE(NEW.taxa_turno_entregador, 0), 0);
    ELSE
      -- Frete global (já inclui o adicional de retorno por km quando o
      -- pagamento é em cartão na entrega, cobrado do cliente).
      _frete_entregador := GREATEST(
        COALESCE(NEW.taxa_entrega, 0) - COALESCE(NEW.taxa_por_pedido_aplicada, 0),
        0
      );
    END IF;

    _taxa_entregador := _frete_entregador + COALESCE(NEW.bonus_entregador, 0);
    IF _taxa_entregador <= 0 THEN RETURN NEW; END IF;

    IF EXISTS (
      SELECT 1 FROM public.entregadores_saldo_saque_movimentos
      WHERE pedido_id = NEW.id AND tipo = 'credito_entrega'
    ) THEN
      RETURN NEW;
    END IF;

    PERFORM public.aplicar_movimento_entregador_saque(
      NEW.entregador_id, _taxa_entregador, 'credito_entrega', NEW.id, NULL,
      'Entrega pedido #' || NEW.numero
        || CASE WHEN NEW.agendamento_id IS NOT NULL THEN ' (turno agendado)' ELSE '' END
    );

    PERFORM public.aplicar_movimento_loja_saldo(
      NEW.loja_id, -_taxa_entregador, 'debito_pedido', NEW.id,
      'Taxa de entrega pedido #' || NEW.numero
        || CASE WHEN NEW.agendamento_id IS NOT NULL THEN ' (turno agendado)' ELSE '' END
    );
  END IF;
  RETURN NEW;
END;
$function$;