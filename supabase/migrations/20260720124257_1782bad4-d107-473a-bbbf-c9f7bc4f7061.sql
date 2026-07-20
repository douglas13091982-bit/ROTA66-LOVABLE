CREATE OR REPLACE FUNCTION public.validar_saldo_loja_para_pedido()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _saldo numeric;
  _necessario numeric;
BEGIN
  IF NEW.status IS DISTINCT FROM 'pronto'::pedido_status THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'pronto'::pedido_status THEN
    RETURN NEW;
  END IF;

  _necessario := COALESCE(NEW.taxa_entrega, 0) + COALESCE(NEW.bonus_entregador, 0);
  SELECT COALESCE(saldo, 0) INTO _saldo FROM public.lojas_saldo WHERE loja_id = NEW.loja_id;
  IF COALESCE(_saldo, 0) < _necessario THEN
    RAISE EXCEPTION 'Saldo insuficiente para liberar o pedido (necessário R$ %). Recarregue o saldo da loja.', to_char(_necessario, 'FM999999990.00')
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$function$;