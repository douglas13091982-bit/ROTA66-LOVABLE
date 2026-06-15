
CREATE OR REPLACE FUNCTION public.buscar_entregador(termo text)
RETURNS TABLE (id uuid, full_name text, phone text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.phone
  FROM public.profiles p
  INNER JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'entregador'::public.app_role
  WHERE
    public.has_role(auth.uid(), 'loja_admin'::public.app_role)
    AND termo IS NOT NULL
    AND length(trim(termo)) >= 3
    AND (
      p.phone = termo
      OR p.full_name ILIKE '%' || termo || '%'
    )
  LIMIT 20;
$$;

REVOKE ALL ON FUNCTION public.buscar_entregador(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buscar_entregador(text) TO authenticated;
