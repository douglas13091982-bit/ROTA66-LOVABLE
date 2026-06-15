CREATE OR REPLACE FUNCTION public.get_entregadores_turnos_loja(_loja_id uuid)
RETURNS TABLE(id uuid, full_name text, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT DISTINCT p.id, p.full_name, p.avatar_url
  FROM public.agendamentos a
  JOIN public.profiles p ON p.id = a.entregador_id
  WHERE a.loja_id = _loja_id
    AND a.entregador_id IS NOT NULL
    AND public.is_loja_owner(auth.uid(), _loja_id);
$$;