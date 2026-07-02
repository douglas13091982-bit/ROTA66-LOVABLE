
ALTER TABLE public.lojas_saldo_movimentos
  DROP CONSTRAINT IF EXISTS lojas_saldo_movimentos_tipo_check;

ALTER TABLE public.lojas_saldo_movimentos
  ADD CONSTRAINT lojas_saldo_movimentos_tipo_check
  CHECK (tipo = ANY (ARRAY[
    'recarga','debito_pedido','ajuste_admin','estorno',
    'credito_venda','saque_solicitado','estorno_saque'
  ]));
