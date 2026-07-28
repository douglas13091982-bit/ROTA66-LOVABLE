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
    public.has_role(auth.uid(), 'loja_admin'::public.app_role)
    AND length(t.d) >= 10
    AND right(regexp_replace(COALESCE(p.phone, ''), '\D', '', 'g'), length(t.d)) = t.d
  LIMIT 2;
$function$;