CREATE OR REPLACE FUNCTION public.create_profile_from_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _full_name text := NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), '');
  _phone     text := NULLIF(trim(NEW.raw_user_meta_data->>'phone'), '');
  _cpf_raw   text := NEW.raw_user_meta_data->>'cpf';
  _cpf       text := NULLIF(regexp_replace(COALESCE(_cpf_raw,''), '\D', '', 'g'), '');
  _tipo      text := NEW.raw_user_meta_data->>'tipo_veiculo';
  _endereco  text := NULLIF(trim(NEW.raw_user_meta_data->>'endereco'), '');
  _cidade    text := NULLIF(trim(NEW.raw_user_meta_data->>'cidade'), '');
  _estado    text := NULLIF(upper(trim(NEW.raw_user_meta_data->>'estado')), '');
  _tipo_veic public.tipo_veiculo;
BEGIN
  BEGIN
    _tipo_veic := COALESCE(_tipo::public.tipo_veiculo, 'moto'::public.tipo_veiculo);
  EXCEPTION WHEN others THEN
    _tipo_veic := 'moto'::public.tipo_veiculo;
  END;

  INSERT INTO public.profiles (id, full_name, phone, cpf, tipo_veiculo, endereco, cidade, estado)
  VALUES (NEW.id, _full_name, _phone, _cpf, _tipo_veic, _endereco, _cidade, _estado)
  ON CONFLICT (id) DO UPDATE SET
    full_name    = COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name),
    phone        = COALESCE(NULLIF(public.profiles.phone, ''),     EXCLUDED.phone),
    cpf          = COALESCE(public.profiles.cpf,                   EXCLUDED.cpf),
    tipo_veiculo = COALESCE(public.profiles.tipo_veiculo,          EXCLUDED.tipo_veiculo, 'moto'::public.tipo_veiculo),
    endereco     = COALESCE(NULLIF(public.profiles.endereco, ''),  EXCLUDED.endereco),
    cidade       = COALESCE(NULLIF(public.profiles.cidade, ''),    EXCLUDED.cidade),
    estado       = COALESCE(NULLIF(public.profiles.estado, ''),    EXCLUDED.estado);

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.assign_role_from_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _role text;
BEGIN
  _role := NEW.raw_user_meta_data->>'role';
  IF _role IN ('loja_admin','entregador','cliente','admin','super_admin','revendedor') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, _role::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;