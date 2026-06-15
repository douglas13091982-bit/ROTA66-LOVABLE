CREATE POLICY "Entregador vê pedidos das lojas vinculadas"
ON public.pedidos FOR SELECT TO authenticated
USING (
  entregador_id IS NULL
  AND status IN ('pronto','em_rota')
  AND EXISTS (
    SELECT 1 FROM public.loja_entregadores le
    WHERE le.loja_id = pedidos.loja_id
      AND le.entregador_id = auth.uid()
      AND le.ativo = true
  )
);

DROP POLICY IF EXISTS "Entregador atualiza seu pedido" ON public.pedidos;
CREATE POLICY "Entregador aceita/atualiza pedido"
ON public.pedidos FOR UPDATE TO authenticated
USING (
  auth.uid() = entregador_id
  OR (entregador_id IS NULL
      AND status = 'pronto'
      AND EXISTS (SELECT 1 FROM public.loja_entregadores le
                  WHERE le.loja_id = pedidos.loja_id
                    AND le.entregador_id = auth.uid()
                    AND le.ativo = true))
)
WITH CHECK (auth.uid() = entregador_id);