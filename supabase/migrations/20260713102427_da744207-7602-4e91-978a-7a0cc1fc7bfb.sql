
-- Registrar a taxa cobrada pelo Mercado Pago na venda do catálogo
-- e debitar automaticamente do saldo da loja quando o pagamento aprovar.

ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS taxa_mp numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mp_metodo text;

-- Debita a taxa MP do saldo da loja e grava no pedido.
-- Idempotente: só executa se pedidos.taxa_mp ainda for 0.
CREATE OR REPLACE FUNCTION public.debitar_taxa_mp_pedido(
  _pedido_id uuid,
  _taxa numeric,
  _metodo text
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

  SELECT loja_id, COALESCE(taxa_mp, 0) INTO v_loja, v_atual
  FROM public.pedidos
  WHERE id = _pedido_id
  FOR UPDATE;

  IF NOT FOUND OR v_loja IS NULL THEN
    RETURN;
  END IF;

  IF v_atual > 0 THEN
    -- já debitado antes
    RETURN;
  END IF;

  UPDATE public.pedidos
     SET taxa_mp = _taxa,
         mp_metodo = COALESCE(_metodo, mp_metodo)
   WHERE id = _pedido_id;

  PERFORM public.aplicar_movimento_loja_saldo(
    v_loja,
    -_taxa,
    'taxa_mp',
    _pedido_id,
    'Taxa Mercado Pago (' || COALESCE(_metodo, 'mp') || ') pedido #' || _pedido_id::text
  );
END;
$$;

REVOKE ALL ON FUNCTION public.debitar_taxa_mp_pedido(uuid, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.debitar_taxa_mp_pedido(uuid, numeric, text) TO service_role;
