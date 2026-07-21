
CREATE OR REPLACE FUNCTION public.processar_saldos_pedido_entregue()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _frete_entregador numeric;
  _taxa_entregador numeric;
  _eh_cartao boolean;
BEGIN
  IF NEW.status = 'entregue'::pedido_status
     AND (OLD.status IS DISTINCT FROM NEW.status)
     AND NEW.entregador_id IS NOT NULL THEN

    _frete_entregador := GREATEST(
      COALESCE(NEW.taxa_entrega, 0) - COALESCE(NEW.taxa_por_pedido_aplicada, 0),
      0
    );

    -- Cartão na entrega: entregador precisa voltar à loja para devolver a
    -- maquininha, então recebe o frete dobrado. A diferença é debitada do
    -- saldo da loja (cliente continua pagando o frete normal).
    _eh_cartao := lower(coalesce(NEW.forma_pagamento::text, '')) IN ('cartao', 'cartao_credito', 'cartao_debito');
    IF _eh_cartao THEN
      _frete_entregador := _frete_entregador * 2;
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
        || CASE WHEN _eh_cartao THEN ' (cartão: frete 2x)' ELSE '' END
    );

    PERFORM public.aplicar_movimento_loja_saldo(
      NEW.loja_id, -_taxa_entregador, 'debito_pedido', NEW.id,
      'Taxa de entrega pedido #' || NEW.numero
        || CASE WHEN _eh_cartao THEN ' (cartão: frete 2x p/ retorno da maquininha)' ELSE '' END
    );
  END IF;
  RETURN NEW;
END;
$function$;
