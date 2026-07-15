
-- 1) Tabela de colaboradores do franqueado
CREATE TABLE public.franqueado_colaboradores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  franqueado_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  colaborador_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (colaborador_user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.franqueado_colaboradores TO authenticated;
GRANT ALL ON public.franqueado_colaboradores TO service_role;

ALTER TABLE public.franqueado_colaboradores ENABLE ROW LEVEL SECURITY;

-- Franqueado (dono) gerencia seus próprios colaboradores
CREATE POLICY "Franqueado gerencia seus colaboradores"
  ON public.franqueado_colaboradores
  FOR ALL
  TO authenticated
  USING (franqueado_user_id = auth.uid())
  WITH CHECK (franqueado_user_id = auth.uid());

-- Colaborador lê o próprio vínculo
CREATE POLICY "Colaborador le proprio vinculo"
  ON public.franqueado_colaboradores
  FOR SELECT
  TO authenticated
  USING (colaborador_user_id = auth.uid());

-- Trigger de updated_at
CREATE TRIGGER trg_franq_colab_updated
BEFORE UPDATE ON public.franqueado_colaboradores
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Helper: retorna user_id do franqueado a que um colaborador pertence
CREATE OR REPLACE FUNCTION public.franqueado_do_colaborador(_uid uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT franqueado_user_id
  FROM public.franqueado_colaboradores
  WHERE colaborador_user_id = _uid AND ativo = true
  LIMIT 1;
$$;

-- 3) Atualiza cidade_do_franqueado para considerar colaboradores
CREATE OR REPLACE FUNCTION public.cidade_do_franqueado(_uid uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cidade FROM public.franqueados_config
   WHERE user_id = _uid
  UNION ALL
  SELECT fc.cidade
    FROM public.franqueado_colaboradores fk
    JOIN public.franqueados_config fc ON fc.user_id = fk.franqueado_user_id
   WHERE fk.colaborador_user_id = _uid AND fk.ativo = true
  LIMIT 1;
$$;

-- 4) is_franquia_owner NUNCA pode ser true para colaboradores
CREATE OR REPLACE FUNCTION public.is_franquia_owner(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid AND role = 'super_admin')
     AND NOT EXISTS (SELECT 1 FROM public.franqueados_config WHERE user_id = _uid)
     AND NOT EXISTS (SELECT 1 FROM public.franqueado_colaboradores WHERE colaborador_user_id = _uid AND ativo = true);
$$;

-- 5) Trigger: ao aceitar como colaborador, garantir role super_admin (para passar em has_role nas policies)
CREATE OR REPLACE FUNCTION public.grant_super_admin_to_colaborador()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.ativo = true THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.colaborador_user_id, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_colab_grant_super
AFTER INSERT OR UPDATE OF ativo ON public.franqueado_colaboradores
FOR EACH ROW EXECUTE FUNCTION public.grant_super_admin_to_colaborador();

-- 6) Ao remover/desativar colaborador, retirar role super_admin (a menos que já fosse admin/franqueado)
CREATE OR REPLACE FUNCTION public.revoke_super_admin_from_colaborador()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
BEGIN
  v_uid := COALESCE(OLD.colaborador_user_id, NEW.colaborador_user_id);
  -- Se ainda existe outro vínculo ativo, não faz nada
  IF EXISTS (
    SELECT 1 FROM public.franqueado_colaboradores
     WHERE colaborador_user_id = v_uid AND ativo = true
       AND (TG_OP = 'DELETE' OR id <> NEW.id)
  ) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  -- Se não é franqueado próprio, remove super_admin
  IF NOT EXISTS (SELECT 1 FROM public.franqueados_config WHERE user_id = v_uid) THEN
    DELETE FROM public.user_roles WHERE user_id = v_uid AND role = 'super_admin';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_colab_revoke_super_del
AFTER DELETE ON public.franqueado_colaboradores
FOR EACH ROW EXECUTE FUNCTION public.revoke_super_admin_from_colaborador();

CREATE TRIGGER trg_colab_revoke_super_upd
AFTER UPDATE OF ativo ON public.franqueado_colaboradores
FOR EACH ROW
WHEN (OLD.ativo = true AND NEW.ativo = false)
EXECUTE FUNCTION public.revoke_super_admin_from_colaborador();
