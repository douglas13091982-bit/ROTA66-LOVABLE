-- 1) Confirma manualmente o pedido #121 cujo pagamento foi aprovado no MP
UPDATE public.pedidos
SET status = 'em_preparo'::pedido_status,
    mp_payment_status = 'approved',
    pagamento_aprovado_em = COALESCE(pagamento_aprovado_em, now())
WHERE id = '27900f02-e0b3-4939-bb1e-2f3da18c561e'
  AND status = 'aguardando_pagamento'::pedido_status;

-- 2) RPC robusta para o webhook/cron usarem ao confirmar pagamentos legados
CREATE OR REPLACE FUNCTION public.confirmar_pagamento_pedido_legado(
  _pedido_id uuid,
  _mp_payment_id text,
  _mp_status text
) RETURNS TABLE(id uuid, numero int, status pedido_status)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _mp_status = 'approved' THEN
    RETURN QUERY
      UPDATE public.pedidos p
      SET status = 'em_preparo'::pedido_status,
          mp_payment_status = _mp_status,
          mp_payment_id = COALESCE(p.mp_payment_id, _mp_payment_id),
          pagamento_aprovado_em = COALESCE(p.pagamento_aprovado_em, now())
      WHERE p.id = _pedido_id
        AND p.status = 'aguardando_pagamento'::pedido_status
      RETURNING p.id, p.numero, p.status;
  ELSIF _mp_status IN ('cancelled','rejected','refunded','charged_back') THEN
    RETURN QUERY
      UPDATE public.pedidos p
      SET status = 'cancelado'::pedido_status,
          mp_payment_status = _mp_status
      WHERE p.id = _pedido_id
        AND p.status = 'aguardando_pagamento'::pedido_status
      RETURNING p.id, p.numero, p.status;
  ELSE
    RETURN QUERY
      UPDATE public.pedidos p
      SET mp_payment_status = _mp_status
      WHERE p.id = _pedido_id
        AND p.status = 'aguardando_pagamento'::pedido_status
      RETURNING p.id, p.numero, p.status;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirmar_pagamento_pedido_legado(uuid, text, text) TO service_role;