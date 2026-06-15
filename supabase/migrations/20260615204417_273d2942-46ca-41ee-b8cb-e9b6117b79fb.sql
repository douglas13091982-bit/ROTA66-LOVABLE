
-- 1) Função que atribui o papel a partir do metadata no signup
CREATE OR REPLACE FUNCTION public.assign_role_from_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _role text;
BEGIN
  _role := NEW.raw_user_meta_data->>'role';
  IF _role IN ('loja_admin','entregador','cliente','admin','super_admin') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, _role::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- 2) Trigger no auth.users para novos cadastros
DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_role
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.assign_role_from_metadata();

-- 3) Backfill: usuários existentes sem papel ganham o papel do metadata
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, (u.raw_user_meta_data->>'role')::public.app_role
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE ur.user_id IS NULL
  AND (u.raw_user_meta_data->>'role') IN ('loja_admin','entregador','cliente','admin','super_admin')
ON CONFLICT (user_id, role) DO NOTHING;
