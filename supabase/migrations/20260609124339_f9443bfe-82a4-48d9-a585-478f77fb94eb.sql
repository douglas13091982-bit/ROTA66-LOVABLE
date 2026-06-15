CREATE OR REPLACE FUNCTION public.cpf_disponivel(_cpf text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s text;
BEGIN
  IF _cpf IS NULL THEN RETURN false; END IF;
  s := regexp_replace(_cpf, '\D', '', 'g');
  IF NOT public.is_valid_cpf(s) THEN RETURN false; END IF;
  RETURN NOT EXISTS (SELECT 1 FROM public.profiles WHERE cpf = s);
END;
$$;

GRANT EXECUTE ON FUNCTION public.cpf_disponivel(text) TO anon, authenticated;