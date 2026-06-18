CREATE OR REPLACE FUNCTION public.gerar_cobranca_pedido_entregue()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _taxa numeric;
  _prazo integer;
  _plano boolean;
BEGIN
  IF NEW.status = 'entregue'::pedido_status
     AND (OLD.status IS DISTINCT FROM NEW.status) THEN

    -- Lê a taxa do plano contratado pela loja (não mais a taxa global)
    SELECT COALESCE(plano_mensal_ativo, false),
           COALESCE(taxa_por_pedido, 0)
      INTO _plano, _taxa
      FROM public.lojas
      WHERE id = NEW.loja_id;

    -- Loja com plano mensal ativo: não cobra taxa por pedido
    IF _plano = true THEN
      RETURN NEW;
    END IF;

    -- Taxa zero (sem plano configurado ou plano isento): nada a cobrar
    IF _taxa IS NULL OR _taxa <= 0 THEN
      RETURN NEW;
    END IF;

    -- Prazo continua vindo da config global
    SELECT prazo_pagamento_dias
      INTO _prazo
      FROM public.config_financeiro
      WHERE singleton = true
      LIMIT 1;
    IF _prazo IS NULL THEN _prazo := 30; END IF;

    INSERT INTO public.cobrancas_loja (loja_id, pedido_id, valor, vencimento)
    VALUES (NEW.loja_id, NEW.id, _taxa, now() + make_interval(days => _prazo))
    ON CONFLICT (pedido_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;