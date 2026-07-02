CREATE OR REPLACE FUNCTION public.processar_saldos_pedido_entregue()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _taxa numeric;
BEGIN
  IF NEW.status = 'entregue'::pedido_status
     AND (OLD.status IS DISTINCT FROM NEW.status)
     AND NEW.entregador_id IS NOT NULL THEN

    _taxa := COALESCE(NEW.taxa_entrega, 0) + COALESCE(NEW.bonus_entregador, 0);
    IF _taxa <= 0 THEN RETURN NEW; END IF;

    IF EXISTS (
      SELECT 1 FROM public.entregadores_saldo_saque_movimentos
      WHERE pedido_id = NEW.id AND tipo = 'credito_entrega'
    ) THEN
      RETURN NEW;
    END IF;

    PERFORM public.aplicar_movimento_entregador_saque(
      NEW.entregador_id, _taxa, 'credito_entrega', NEW.id, NULL,
      'Entrega pedido #' || NEW.numero
    );

    PERFORM public.aplicar_movimento_loja_saldo(
      NEW.loja_id, -_taxa, 'debito_pedido', NEW.id,
      'Taxa de entrega pedido #' || NEW.numero
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Reconcile pedido #126 (já processado sem bônus)
DO $$
DECLARE
  _pedido RECORD;
BEGIN
  SELECT id, numero, loja_id, entregador_id, bonus_entregador
    INTO _pedido
    FROM public.pedidos
    WHERE numero = 126 AND status = 'entregue' AND entregador_id IS NOT NULL;
  IF _pedido.id IS NOT NULL AND COALESCE(_pedido.bonus_entregador, 0) > 0 THEN
    PERFORM public.aplicar_movimento_entregador_saque(
      _pedido.entregador_id, _pedido.bonus_entregador, 'credito_entrega', _pedido.id, NULL,
      'Ajuste bônus pedido #' || _pedido.numero
    );
    PERFORM public.aplicar_movimento_loja_saldo(
      _pedido.loja_id, -_pedido.bonus_entregador, 'debito_pedido', _pedido.id,
      'Ajuste bônus pedido #' || _pedido.numero
    );
  END IF;
END $$;