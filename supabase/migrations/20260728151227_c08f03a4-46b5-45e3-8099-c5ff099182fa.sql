DROP POLICY IF EXISTS "Super admin gerencia config financeiro" ON public.config_financeiro;

CREATE POLICY "Owner da plataforma gerencia config financeiro"
ON public.config_financeiro
FOR ALL
TO authenticated
USING (public.is_franquia_owner(auth.uid()))
WITH CHECK (public.is_franquia_owner(auth.uid()));