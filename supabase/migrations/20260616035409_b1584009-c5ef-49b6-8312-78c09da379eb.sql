
-- Entregador pode ler pedidos cancelados das lojas que está vinculado
CREATE POLICY "Entregador vê cancelamento de pedidos vinculados"
ON public.pedidos
FOR SELECT
TO authenticated
USING (
  status = 'cancelado'::pedido_status
  AND EXISTS (
    SELECT 1 FROM public.loja_entregadores le
    WHERE le.loja_id = pedidos.loja_id
      AND le.entregador_id = auth.uid()
      AND le.ativo = true
  )
);

-- Entregador pode ler pedidos cancelados quando recebeu (ou tinha) oferta externa
CREATE POLICY "Entregador vê cancelamento de pedidos do pool externo"
ON public.pedidos
FOR SELECT
TO authenticated
USING (
  status = 'cancelado'::pedido_status
  AND EXISTS (
    SELECT 1 FROM public.pedido_ofertas o
    WHERE o.pedido_id = pedidos.id
      AND o.entregador_id = auth.uid()
  )
);

-- Garante que pedido_ofertas é transmitida em tempo real (ignora se já estiver)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pedido_ofertas;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;
