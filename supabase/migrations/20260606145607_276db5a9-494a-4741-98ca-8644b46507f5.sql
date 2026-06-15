CREATE POLICY "Entregador vê lojas vinculadas"
ON public.lojas
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.loja_entregadores le
    WHERE le.loja_id = lojas.id
      AND le.entregador_id = auth.uid()
  )
);