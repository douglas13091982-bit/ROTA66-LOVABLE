
-- Franqueados precisam ver entregadores recém-cadastrados que ainda não têm cidade atribuída.
-- Adicionamos policy que libera super_admins verem profiles de entregadores sem city_id.
CREATE POLICY "Super admin vê entregadores sem cidade"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  AND city_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = profiles.id AND ur.role = 'entregador'::app_role
  )
);
