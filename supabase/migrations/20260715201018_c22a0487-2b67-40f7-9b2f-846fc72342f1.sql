DROP POLICY IF EXISTS "Admins veem todos os pedidos" ON public.password_reset_requests;
DROP POLICY IF EXISTS "Admins atualizam pedidos" ON public.password_reset_requests;

CREATE POLICY "Admins e franqueados veem pedidos"
ON public.password_reset_requests
FOR SELECT
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins e franqueados atualizam pedidos"
ON public.password_reset_requests
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'admin')
);