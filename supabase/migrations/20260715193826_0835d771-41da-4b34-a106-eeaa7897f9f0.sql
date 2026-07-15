
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS taxa_marketplace numeric NOT NULL DEFAULT 0;

ALTER TABLE public.lojas_saldo_movimentos DROP CONSTRAINT IF EXISTS lojas_saldo_movimentos_tipo_check;
ALTER TABLE public.lojas_saldo_movimentos ADD CONSTRAINT lojas_saldo_movimentos_tipo_check CHECK (
  tipo = ANY (ARRAY[
    'recarga','debito_pedido','ajuste_admin','estorno','credito_venda',
    'saque_solicitado','estorno_saque','debito_mensalidade','debito_taxa_mp',
    'debito_taxa_pedido','debito_taxa_marketplace'
  ])
);

CREATE OR REPLACE FUNCTION public.debitar_taxa_marketplace_pedido(
  _pedido_id uuid,
  _taxa numeric
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_loja uuid;
  v_atual numeric;
BEGIN
  IF _pedido_id IS NULL OR _taxa IS NULL OR _taxa <= 0 THEN
    RETURN;
  END IF;

  SELECT loja_id, COALESCE(taxa_marketplace, 0) INTO v_loja, v_atual
  FROM public.pedidos
  WHERE id = _pedido_id
  FOR UPDATE;

  IF NOT FOUND OR v_loja IS NULL THEN
    RETURN;
  END IF;

  IF v_atual > 0 THEN
    RETURN; -- já debitado antes (idempotente)
  END IF;

  UPDATE public.pedidos
     SET taxa_marketplace = _taxa
   WHERE id = _pedido_id;

  PERFORM public.aplicar_movimento_loja_saldo(
    v_loja,
    -_taxa,
    'debito_taxa_marketplace',
    _pedido_id,
    'Taxa marketplace do pedido #' || _pedido_id::text
  );
END;
$$;

REVOKE ALL ON FUNCTION public.debitar_taxa_marketplace_pedido(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.debitar_taxa_marketplace_pedido(uuid, numeric) TO service_role;
