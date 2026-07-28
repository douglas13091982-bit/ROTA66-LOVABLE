CREATE OR REPLACE FUNCTION public.buscar_entregador(termo text)
 RETURNS TABLE(id uuid, full_name text, phone text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH t AS (
    SELECT right(regexp_replace(COALESCE(termo, ''), '\D', '', 'g'), 11) AS d
  )
  SELECT p.id, p.full_name, p.phone
  FROM public.profiles p
  INNER JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'entregador'::public.app_role
  CROSS JOIN t
  WHERE
    (
      public.has_role(auth.uid(), 'loja_admin'::public.app_role)
      OR public.has_admin_area(auth.uid(), 'entregadores'::public.admin_area, false)
    )
    AND length(t.d) >= 10
    AND right(regexp_replace(COALESCE(p.phone, ''), '\D', '', 'g'), length(t.d)) = t.d
  LIMIT 2;
$function$;

DROP POLICY IF EXISTS "Admin da cidade gerencia vinculos" ON public.loja_entregadores;
CREATE POLICY "Admin da cidade gerencia vinculos"
  ON public.loja_entregadores FOR ALL
  TO authenticated
  USING (public.admin_ve_loja(auth.uid(), loja_id))
  WITH CHECK (public.admin_ve_loja(auth.uid(), loja_id) AND public.is_entregador_aprovado(entregador_id));