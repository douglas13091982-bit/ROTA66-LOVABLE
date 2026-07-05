
-- Snapshot da taxa do plano aplicada no momento do pedido
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS taxa_por_pedido_aplicada numeric(10,2);

-- Backfill: se subtrair a taxa atual da loja gerar frete abaixo do mínimo global,
-- assumimos que a taxa do plano NÃO foi aplicada no pedido (snapshot = 0).
-- Caso contrário, usamos a taxa atual da loja como snapshot.
WITH cfg AS (
  SELECT COALESCE(
    (SELECT MIN(valor_minimo) FROM public.tarifas_globais WHERE ativa = true AND tipo_veiculo = 'moto'),
    0
  ) AS min_global
)
UPDATE public.pedidos p
SET taxa_por_pedido_aplicada = CASE
  WHEN l.plano_mensal_ativo THEN 0
  WHEN COALESCE(l.taxa_por_pedido, 0) = 0 THEN 0
  WHEN p.taxa_entrega - COALESCE(l.taxa_por_pedido, 0) < cfg.min_global THEN 0
  ELSE COALESCE(l.taxa_por_pedido, 0)
END
FROM public.lojas l, cfg
WHERE p.loja_id = l.id
  AND p.taxa_por_pedido_aplicada IS NULL;
