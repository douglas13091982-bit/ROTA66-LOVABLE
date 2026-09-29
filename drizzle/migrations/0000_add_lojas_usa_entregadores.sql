-- Permite que cada loja escolha entre usar os entregadores Rota 66
-- ou controlar manualmente todo o fluxo de entrega.
-- TRUE preserva o comportamento existente para lojas já cadastradas.
ALTER TABLE public.lojas
  ADD COLUMN IF NOT EXISTS usa_entregadores boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.lojas.usa_entregadores IS
  'Quando true, a entrega é integrada aos entregadores Rota 66. Quando false, a loja controla manualmente o pedido até entregue.';