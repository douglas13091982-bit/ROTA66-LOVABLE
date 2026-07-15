
-- 1) Trigger: ao entregar o pedido, debita a taxa do saldo da loja
--    imediatamente e registra a cobrança já paga (via saldo).
CREATE OR REPLACE FUNCTION public.gerar_cobranca_pedido_entregue()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _taxa numeric;
  _prazo integer;
  _cob_id uuid;
BEGIN
  IF NEW.status = 'entregue'::pedido_status
     AND (OLD.status IS DISTINCT FROM NEW.status) THEN

    IF NEW.taxa_por_pedido_aplicada IS NOT NULL THEN
      _taxa := NEW.taxa_por_pedido_aplicada;
    ELSE
      SELECT CASE
        WHEN COALESCE(plano_mensal_ativo, false) THEN 0
        ELSE COALESCE(taxa_por_pedido, 0)
      END
      INTO _taxa
      FROM public.lojas
      WHERE id = NEW.loja_id;
    END IF;

    IF _taxa IS NULL OR _taxa <= 0 THEN
      RETURN NEW;
    END IF;

    SELECT prazo_pagamento_dias
      INTO _prazo
      FROM public.config_financeiro
     WHERE singleton = true
     LIMIT 1;
    IF _prazo IS NULL THEN _prazo := 30; END IF;

    -- Insere/obtém a cobrança do pedido (idempotente via UNIQUE(pedido_id)).
    INSERT INTO public.cobrancas_loja
      (loja_id, pedido_id, valor, vencimento,
       pago, pago_em, metodo_pagamento)
    VALUES
      (NEW.loja_id, NEW.id, _taxa, now() + make_interval(days => _prazo),
       true, now(), 'saldo_loja')
    ON CONFLICT (pedido_id) DO NOTHING
    RETURNING id INTO _cob_id;

    -- Se a cobrança já existia (colisão ON CONFLICT), pega o id atual
    -- e garante que esteja marcada como paga via saldo.
    IF _cob_id IS NULL THEN
      SELECT id INTO _cob_id
      FROM public.cobrancas_loja
      WHERE pedido_id = NEW.id;

      IF _cob_id IS NOT NULL THEN
        UPDATE public.cobrancas_loja
           SET pago = true,
               pago_em = COALESCE(pago_em, now()),
               metodo_pagamento = COALESCE(metodo_pagamento, 'saldo_loja')
         WHERE id = _cob_id
           AND pago = false;
      END IF;
    END IF;

    -- Debita a taxa direto do saldo da loja (mesma "conta" que paga
    -- o entregador). O registro fica no extrato de movimentos.
    PERFORM public.aplicar_movimento_loja_saldo(
      NEW.loja_id,
      -_taxa,
      'debito_taxa_pedido',
      NEW.id,
      'Taxa por pedido #' || NEW.numero
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- 2) Desativa geração semanal de cobranças acumuladas: agora cada
--    pedido já cria seu próprio registro pago via saldo.
CREATE OR REPLACE FUNCTION public.gerar_cobrancas_semanais_lojas()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Lógica antiga desativada. Taxas por pedido são debitadas do saldo
  -- da loja no momento da entrega (ver gerar_cobranca_pedido_entregue).
  RETURN 0;
END;
$function$;
