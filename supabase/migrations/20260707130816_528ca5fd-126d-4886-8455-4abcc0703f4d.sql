
CREATE OR REPLACE FUNCTION public.atribuir_cidade_entregador(_entregador_id uuid, _city_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Somente super_admin pode chamar
  IF NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  -- Se for franqueado (não owner), a cidade tem que bater com a dele
  IF NOT public.is_franquia_owner(auth.uid()) THEN
    IF public.cidade_id_do_franqueado(auth.uid()) IS DISTINCT FROM _city_id THEN
      RAISE EXCEPTION 'city_mismatch';
    END IF;
  END IF;

  -- O alvo tem que ser entregador
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _entregador_id AND role = 'entregador'::app_role
  ) THEN
    RAISE EXCEPTION 'not_entregador';
  END IF;

  UPDATE public.profiles
  SET city_id = _city_id
  WHERE id = _entregador_id
    AND city_id IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.atribuir_cidade_entregador(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.atribuir_cidade_entregador(uuid, uuid) TO authenticated;
