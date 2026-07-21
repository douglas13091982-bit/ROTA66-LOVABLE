DROP POLICY IF EXISTS "Entregador vê seu próprio saldo de saque" ON public.entregadores_saldo_saque;
CREATE POLICY "Entregador vê seu próprio saldo de saque"
ON public.entregadores_saldo_saque
FOR SELECT
USING (
  auth.uid() = entregador_id
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);