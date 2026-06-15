
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  _role public.app_role;
  _has_super boolean;
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'phone'
  );

  -- Se ainda não existe nenhum super_admin, este usuário vira o primeiro
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE role = 'super_admin'::public.app_role
  ) INTO _has_super;

  IF NOT _has_super THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin'::public.app_role);
    RETURN NEW;
  END IF;

  -- Caso normal: pega role do metadata, default cliente
  BEGIN
    _role := COALESCE((NEW.raw_user_meta_data ->> 'role')::public.app_role, 'cliente'::public.app_role);
  EXCEPTION WHEN others THEN
    _role := 'cliente'::public.app_role;
  END;

  -- Bloqueia auto-promoção a super_admin após o primeiro
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
