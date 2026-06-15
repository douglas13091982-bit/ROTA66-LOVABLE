
-- Areas enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_area') THEN
    CREATE TYPE public.admin_area AS ENUM (
      'lojas','entregadores','financeiro','creditos','tarifas',
      'roteirizacao','branding','anuncios','notificacao_som','pedidos','app_apk'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.admin_permissoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  area public.admin_area NOT NULL,
  can_write boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, area)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_permissoes TO authenticated;
GRANT ALL ON public.admin_permissoes TO service_role;

ALTER TABLE public.admin_permissoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin manage admin_permissoes" ON public.admin_permissoes;
CREATE POLICY "super_admin manage admin_permissoes" ON public.admin_permissoes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "admin reads own permissoes" ON public.admin_permissoes;
CREATE POLICY "admin reads own permissoes" ON public.admin_permissoes
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP TRIGGER IF EXISTS trg_admin_permissoes_updated_at ON public.admin_permissoes;
CREATE TRIGGER trg_admin_permissoes_updated_at
  BEFORE UPDATE ON public.admin_permissoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.has_admin_area(_user_id uuid, _area public.admin_area, _need_write boolean DEFAULT false)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'super_admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.admin_permissoes
      WHERE user_id = _user_id AND area = _area
        AND (NOT _need_write OR can_write = true)
    );
$$;

CREATE OR REPLACE FUNCTION public.listar_admins()
RETURNS TABLE(user_id uuid, email text, full_name text, is_super boolean, permissoes jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    u.id,
    u.email::text,
    p.full_name,
    EXISTS (SELECT 1 FROM public.user_roles ur2 WHERE ur2.user_id = u.id AND ur2.role = 'super_admin'::public.app_role) AS is_super,
    COALESCE((
      SELECT jsonb_object_agg(ap.area::text, jsonb_build_object('can_write', ap.can_write))
      FROM public.admin_permissoes ap WHERE ap.user_id = u.id
    ), '{}'::jsonb)
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE public.has_role(auth.uid(), 'super_admin'::public.app_role)
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = u.id AND ur.role IN ('super_admin'::public.app_role, 'admin'::public.app_role)
    )
  ORDER BY is_super DESC, p.full_name NULLS LAST, u.email;
$$;

CREATE OR REPLACE FUNCTION public.conceder_admin(_email text, _permissoes jsonb)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid;
  _area_key text;
  _area public.admin_area;
  _write boolean;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  SELECT id INTO _uid FROM auth.users WHERE lower(email) = lower(trim(_email));
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Usuário com email % não encontrado. Peça que ele se cadastre primeiro.', _email;
  END IF;

  IF public.has_role(_uid, 'super_admin'::public.app_role) THEN
    RAISE EXCEPTION 'Este usuário já é super admin';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, 'admin'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  DELETE FROM public.admin_permissoes WHERE user_id = _uid;

  IF _permissoes IS NOT NULL THEN
    FOR _area_key, _write IN
      SELECT key, COALESCE((value->>'can_write')::boolean, false)
      FROM jsonb_each(_permissoes)
    LOOP
      BEGIN
        _area := _area_key::public.admin_area;
      EXCEPTION WHEN others THEN
        CONTINUE;
      END;
      INSERT INTO public.admin_permissoes (user_id, area, can_write)
      VALUES (_uid, _area, _write);
    END LOOP;
  END IF;

  RETURN _uid;
END;
$$;

CREATE OR REPLACE FUNCTION public.revogar_admin(_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  IF public.has_role(_user_id, 'super_admin'::public.app_role) THEN
    RAISE EXCEPTION 'Não é possível revogar um super admin';
  END IF;
  DELETE FROM public.admin_permissoes WHERE user_id = _user_id;
  DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'admin'::public.app_role;
END;
$$;

CREATE OR REPLACE FUNCTION public.minhas_areas_admin()
RETURNS TABLE(area text, can_write boolean, is_super boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    a.area_value::text,
    CASE WHEN public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN true
         ELSE COALESCE((SELECT can_write FROM public.admin_permissoes WHERE user_id = auth.uid() AND area = a.area_value), false) END,
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
  FROM (SELECT unnest(enum_range(NULL::public.admin_area)) AS area_value) a
  WHERE public.has_role(auth.uid(), 'super_admin'::public.app_role)
     OR EXISTS (SELECT 1 FROM public.admin_permissoes WHERE user_id = auth.uid() AND area = a.area_value);
$$;
