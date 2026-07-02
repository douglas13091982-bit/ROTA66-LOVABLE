CREATE POLICY "Entregador vinculado vê loja"
ON public.lojas FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.loja_entregadores le
    WHERE le.loja_id = lojas.id AND le.entregador_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.loja_id = lojas.id AND p.entregador_id = auth.uid()
  )
);