DROP POLICY IF EXISTS "Admin lê todos os saques da loja" ON public.lojas_saques;
DROP POLICY IF EXISTS "Admin atualiza saques da loja" ON public.lojas_saques;

CREATE POLICY "Super admin lê todos os saques da loja"
  ON public.lojas_saques FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Super admin atualiza saques da loja"
  ON public.lojas_saques FOR UPDATE
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));