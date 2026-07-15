
-- Remove triggers/functions that promoted colaboradores a super_admin
DROP TRIGGER IF EXISTS trg_colab_grant_super ON public.franqueado_colaboradores;
DROP TRIGGER IF EXISTS trg_colab_revoke_super_upd ON public.franqueado_colaboradores;
DROP TRIGGER IF EXISTS trg_colab_revoke_super_del ON public.franqueado_colaboradores;
DROP FUNCTION IF EXISTS public.grant_super_admin_to_colaborador() CASCADE;
DROP FUNCTION IF EXISTS public.revoke_super_admin_from_colaborador() CASCADE;

-- Limpa super_admin de quem só é colaborador (não é franqueado dono nem admin real por outra via)
DELETE FROM public.user_roles ur
WHERE ur.role = 'super_admin'::public.app_role
  AND EXISTS (
    SELECT 1 FROM public.franqueado_colaboradores c
    WHERE c.colaborador_user_id = ur.user_id AND c.ativo = true
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.franqueados_config fc WHERE fc.user_id = ur.user_id
  );

-- has_role agora reconhece colaborador ativo como super_admin efetivo,
-- sem precisar conceder o papel de fato.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
  OR (
    _role = 'super_admin'::public.app_role
    AND EXISTS (
      SELECT 1 FROM public.franqueado_colaboradores
      WHERE colaborador_user_id = _user_id AND ativo = true
    )
  );
$$;
