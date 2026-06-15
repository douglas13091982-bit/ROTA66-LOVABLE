
CREATE OR REPLACE FUNCTION public.listar_entregadores_loja(_loja_id uuid)
RETURNS TABLE (
  vinculo_id uuid,
  ativo boolean,
  created_at timestamptz,
  entregador_id uuid,
  full_name text,
  phone text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT le.id, le.ativo, le.created_at, le.entregador_id, p.full_name, p.phone
  FROM public.loja_entregadores le
  LEFT JOIN public.profiles p ON p.id = le.entregador_id
  WHERE le.loja_id = _loja_id
    AND public.is_loja_owner(auth.uid(), _loja_id)
  ORDER BY le.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.listar_entregadores_loja(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.listar_entregadores_loja(uuid) TO authenticated;
