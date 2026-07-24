-- Normaliza nomes dos entregadores existentes para MAIÚSCULO
UPDATE public.profiles p
SET full_name = upper(full_name)
WHERE full_name IS NOT NULL
  AND full_name <> upper(full_name)
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p.id AND ur.role = 'entregador'
  );

-- Trigger: sempre que um profile de entregador for inserido/atualizado, força upper no full_name
CREATE OR REPLACE FUNCTION public.tg_profiles_entregador_uppercase()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.full_name IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = NEW.id AND ur.role = 'entregador'
  ) THEN
    NEW.full_name := upper(NEW.full_name);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_entregador_uppercase ON public.profiles;
CREATE TRIGGER trg_profiles_entregador_uppercase
BEFORE INSERT OR UPDATE OF full_name ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.tg_profiles_entregador_uppercase();

-- Também dispara quando o papel 'entregador' é atribuído, normalizando o nome existente
CREATE OR REPLACE FUNCTION public.tg_user_roles_entregador_uppercase()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'entregador' THEN
    UPDATE public.profiles
    SET full_name = upper(full_name)
    WHERE id = NEW.user_id
      AND full_name IS NOT NULL
      AND full_name <> upper(full_name);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_roles_entregador_uppercase ON public.user_roles;
CREATE TRIGGER trg_user_roles_entregador_uppercase
AFTER INSERT ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.tg_user_roles_entregador_uppercase();
