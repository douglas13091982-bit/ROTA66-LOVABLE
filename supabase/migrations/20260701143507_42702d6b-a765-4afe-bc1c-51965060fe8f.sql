CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _role public.app_role;
  _has_super boolean;
  _cpf_raw text;
  _cpf text;
  _role_meta text;
  _tipo_veic_meta text;
  _tipo_veic public.tipo_veiculo;
  _endereco text;
  _cidade text;
  _estado text;
BEGIN
  _cpf_raw := NEW.raw_user_meta_data ->> 'cpf';
  IF _cpf_raw IS NOT NULL THEN
    _cpf := regexp_replace(_cpf_raw, '\D', '', 'g');
    IF _cpf = '' THEN _cpf := NULL; END IF;
  END IF;

  _role_meta := NEW.raw_user_meta_data ->> 'role';
  _tipo_veic_meta := NEW.raw_user_meta_data ->> 'tipo_veiculo';
  _endereco := NULLIF(trim(NEW.raw_user_meta_data ->> 'endereco'), '');
  _cidade := NULLIF(trim(NEW.raw_user_meta_data ->> 'cidade'), '');
  _estado := NULLIF(upper(trim(NEW.raw_user_meta_data ->> 'estado')), '');

  IF _role_meta = 'entregador' THEN
    IF _cpf IS NULL OR NOT public.is_valid_cpf(_cpf) THEN
      RAISE EXCEPTION 'CPF inválido ou ausente';
    END IF;
    IF EXISTS (SELECT 1 FROM public.profiles WHERE cpf = _cpf) THEN
      RAISE EXCEPTION 'Este CPF já está cadastrado.';
    END IF;
  ELSIF _cpf IS NOT NULL AND NOT public.is_valid_cpf(_cpf) THEN
    RAISE EXCEPTION 'CPF inválido';
  END IF;

  BEGIN
    _tipo_veic := COALESCE(_tipo_veic_meta::public.tipo_veiculo, 'moto'::public.tipo_veiculo);
  EXCEPTION WHEN others THEN
    _tipo_veic := 'moto'::public.tipo_veiculo;
  END;

  BEGIN
    INSERT INTO public.profiles (id, full_name, phone, cpf, tipo_veiculo, endereco, cidade, estado)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'phone',
      _cpf,
      _tipo_veic,
      _endereco,
      _cidade,
      _estado
    );
  EXCEPTION
    WHEN unique_violation THEN
      IF _cpf IS NOT NULL THEN
        RAISE EXCEPTION 'Este CPF já está cadastrado.';
      ELSE
        RAISE;
      END IF;
  END;

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
    _role := 'cliente'::public.app_role;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;