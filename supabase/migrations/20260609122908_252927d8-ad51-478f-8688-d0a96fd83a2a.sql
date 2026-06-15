
-- 1) Coluna CPF (armazenada apenas com dígitos)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf text;

-- 2) Função de validação de CPF (formato + dígitos verificadores)
CREATE OR REPLACE FUNCTION public.is_valid_cpf(_cpf text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  s text;
  i int;
  sum1 int := 0;
  sum2 int := 0;
  d1 int;
  d2 int;
BEGIN
  IF _cpf IS NULL THEN RETURN false; END IF;
  s := regexp_replace(_cpf, '\D', '', 'g');
  IF length(s) <> 11 THEN RETURN false; END IF;
  -- Rejeita sequências do tipo 00000000000, 11111111111, ...
  IF s ~ '^(\d)\1{10}$' THEN RETURN false; END IF;

  FOR i IN 1..9 LOOP
    sum1 := sum1 + substring(s, i, 1)::int * (11 - i);
  END LOOP;
  d1 := 11 - (sum1 % 11);
  IF d1 >= 10 THEN d1 := 0; END IF;
  IF d1 <> substring(s, 10, 1)::int THEN RETURN false; END IF;

  FOR i IN 1..10 LOOP
    sum2 := sum2 + substring(s, i, 1)::int * (12 - i);
  END LOOP;
  d2 := 11 - (sum2 % 11);
  IF d2 >= 10 THEN d2 := 0; END IF;
  IF d2 <> substring(s, 11, 1)::int THEN RETURN false; END IF;

  RETURN true;
END;
$$;

-- 3) Normaliza e valida o CPF na escrita (somente dígitos; valida quando preenchido)
CREATE OR REPLACE FUNCTION public.profiles_normalize_cpf()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.cpf IS NOT NULL THEN
    NEW.cpf := regexp_replace(NEW.cpf, '\D', '', 'g');
    IF NEW.cpf = '' THEN
      NEW.cpf := NULL;
    ELSIF NOT public.is_valid_cpf(NEW.cpf) THEN
      RAISE EXCEPTION 'CPF inválido';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_normalize_cpf ON public.profiles;
CREATE TRIGGER trg_profiles_normalize_cpf
  BEFORE INSERT OR UPDATE OF cpf ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_normalize_cpf();

-- 4) Unicidade: um CPF só pode pertencer a um perfil
CREATE UNIQUE INDEX IF NOT EXISTS profiles_cpf_unique
  ON public.profiles (cpf)
  WHERE cpf IS NOT NULL;

-- 5) handle_new_user passa a gravar o CPF informado no cadastro
--    e exige CPF válido para contas de entregador.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role public.app_role;
  _has_super boolean;
  _cpf_raw text;
  _cpf text;
  _role_meta text;
BEGIN
  _cpf_raw := NEW.raw_user_meta_data ->> 'cpf';
  IF _cpf_raw IS NOT NULL THEN
    _cpf := regexp_replace(_cpf_raw, '\D', '', 'g');
    IF _cpf = '' THEN _cpf := NULL; END IF;
  END IF;

  _role_meta := NEW.raw_user_meta_data ->> 'role';

  -- Entregador: CPF obrigatório e válido
  IF _role_meta = 'entregador' THEN
    IF _cpf IS NULL OR NOT public.is_valid_cpf(_cpf) THEN
      RAISE EXCEPTION 'CPF inválido ou ausente';
    END IF;
    IF EXISTS (SELECT 1 FROM public.profiles WHERE cpf = _cpf) THEN
      RAISE EXCEPTION 'Já existe uma conta cadastrada com este CPF';
    END IF;
  ELSIF _cpf IS NOT NULL AND NOT public.is_valid_cpf(_cpf) THEN
    -- Para outros perfis, se mandarem CPF, ele precisa ser válido
    RAISE EXCEPTION 'CPF inválido';
  END IF;

  INSERT INTO public.profiles (id, full_name, phone, cpf)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'phone',
    _cpf
  );

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE role = 'super_admin'::public.app_role
  ) INTO _has_super;

  IF NOT _has_super THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin'::public.app_role);
    RETURN NEW;
  END IF;

  BEGIN
    _role := COALESCE(_role_meta::public.app_role, 'cliente'::public.app_role);
  EXCEPTION WHEN others THEN
    _role := 'cliente'::public.app_role;
  END;

  IF _role = 'super_admin' THEN
    _role := 'cliente';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);

  IF _role = 'entregador' THEN
    INSERT INTO public.entregador_status_conta (entregador_id, status)
    VALUES (NEW.id, 'pendente'::public.status_moderacao)
    ON CONFLICT (entregador_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
