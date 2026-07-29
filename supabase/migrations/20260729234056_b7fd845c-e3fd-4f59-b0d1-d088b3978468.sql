CREATE POLICY "Super admin atualiza pedidos" ON public.pedidos
FOR UPDATE
TO authenticated
USING (
  has_role_scoped(auth.uid(), 'super_admin'::app_role)
  AND (is_franquia_owner(auth.uid()) OR admin_ve_loja(auth.uid(), loja_id))
)
WITH CHECK (
  has_role_scoped(auth.uid(), 'super_admin'::app_role)
  AND (is_franquia_owner(auth.uid()) OR admin_ve_loja(auth.uid(), loja_id))
);