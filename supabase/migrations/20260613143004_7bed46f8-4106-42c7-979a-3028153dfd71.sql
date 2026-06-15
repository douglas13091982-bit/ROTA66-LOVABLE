
-- 1. Enum tipo_veiculo
DO $$ BEGIN
  CREATE TYPE public.tipo_veiculo AS ENUM ('moto','carro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Coluna em profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tipo_veiculo public.tipo_veiculo NOT NULL DEFAULT 'moto';

-- 3. Coluna em config_roteirizacao
ALTER TABLE public.config_roteirizacao
  ADD COLUMN IF NOT EXISTS max_paradas_por_rota_carro integer NOT NULL DEFAULT 12;

-- 4. Atualizar handle_new_user para capturar tipo_veiculo de raw_user_meta_data
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
BEGIN
  _cpf_raw := NEW.raw_user_meta_data ->> 'cpf';
  IF _cpf_raw IS NOT NULL THEN
    _cpf := regexp_replace(_cpf_raw, '\D', '', 'g');
    IF _cpf = '' THEN _cpf := NULL; END IF;
  END IF;

  _role_meta := NEW.raw_user_meta_data ->> 'role';
  _tipo_veic_meta := NEW.raw_user_meta_data ->> 'tipo_veiculo';

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

  INSERT INTO public.profiles (id, full_name, phone, cpf, tipo_veiculo)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'phone',
    _cpf,
    _tipo_veic
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
$function$;
