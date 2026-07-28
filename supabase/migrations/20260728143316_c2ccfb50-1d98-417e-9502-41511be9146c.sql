-- 1) has_role passa a reconhecer APENAS papéis explícitos em user_roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$function$;

-- 2) Função separada para os casos em que colaborador de franqueado herda acesso.
--    Deve SEMPRE ser combinada com um escopo de cidade/franqueado.
CREATE OR REPLACE FUNCTION public.has_role_scoped(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.has_role(_user_id, _role)
    OR (
      _role = 'super_admin'::public.app_role
      AND EXISTS (
        SELECT 1 FROM public.franqueado_colaboradores
        WHERE colaborador_user_id = _user_id AND ativo = true
      )
    );
$function$;

REVOKE ALL ON FUNCTION public.has_role_scoped(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role_scoped(uuid, app_role) TO authenticated, service_role;

-- 3) Helpers já escopados por cidade continuam aceitando colaboradores
CREATE OR REPLACE FUNCTION public.admin_ve_city_id(_uid uuid, _city_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.has_role_scoped(_uid, 'super_admin'::app_role)
     AND (
       public.is_franquia_owner(_uid)
       OR (
         _city_id IS NOT NULL
         AND public.cidade_id_do_franqueado(_uid) IS NOT NULL
         AND _city_id = public.cidade_id_do_franqueado(_uid)
       )
     );
$function$;

CREATE OR REPLACE FUNCTION public.admin_ve_cidade(_uid uuid, _cidade text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.has_role_scoped(_uid, 'super_admin'::app_role)
     AND (
       public.is_franquia_owner(_uid)
       OR lower(coalesce(_cidade,'')) = lower(coalesce(public.cidade_do_franqueado(_uid),''))
     );
$function$;

CREATE OR REPLACE FUNCTION public.admin_ve_profile(_uid uuid, _profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.has_role_scoped(_uid, 'super_admin'::app_role)
     AND (
       public.is_franquia_owner(_uid)
       OR EXISTS (
         SELECT 1
         FROM public.profiles p
         WHERE p.id = _profile_id
           AND p.city_id IS NOT NULL
           AND public.cidade_id_do_franqueado(_uid) IS NOT NULL
           AND p.city_id = public.cidade_id_do_franqueado(_uid)
       )
     );
$function$;

-- Menus/áreas do painel: colaborador continua enxergando, mas cada tabela
-- ainda aplica seu próprio escopo de cidade via RLS.
CREATE OR REPLACE FUNCTION public.has_admin_area(_user_id uuid, _area admin_area, _need_write boolean DEFAULT false)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    public.has_role_scoped(_user_id, 'super_admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.admin_permissoes
      WHERE user_id = _user_id AND area = _area
        AND (NOT _need_write OR can_write = true)
    );
$function$;

-- 4) Políticas já escopadas por cidade voltam a aceitar colaboradores
DROP POLICY IF EXISTS "Super admin vê todos os turnos" ON public.agendamentos;
CREATE POLICY "Super admin vê todos os turnos" ON public.agendamentos
FOR SELECT USING (
  public.has_role_scoped(auth.uid(), 'super_admin'::app_role)
  AND (
    public.is_franquia_owner(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.lojas l
      WHERE l.id = agendamentos.loja_id
        AND lower(coalesce(l.cidade,'')) = lower(coalesce(public.cidade_do_franqueado(auth.uid()),''))
    )
  )
);

DROP POLICY IF EXISTS "Super admin vê todas mensalidades" ON public.mensalidades_loja;
CREATE POLICY "Super admin vê todas mensalidades" ON public.mensalidades_loja
FOR SELECT USING (
  public.has_role_scoped(auth.uid(), 'super_admin'::app_role)
  AND (
    public.is_franquia_owner(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.lojas l
      WHERE l.id = mensalidades_loja.loja_id
        AND lower(coalesce(l.cidade,'')) = lower(coalesce(public.cidade_do_franqueado(auth.uid()),''))
    )
  )
);

DROP POLICY IF EXISTS "Super admin gerencia mensalidades" ON public.mensalidades_loja;
CREATE POLICY "Super admin gerencia mensalidades" ON public.mensalidades_loja
FOR ALL USING (
  public.has_role_scoped(auth.uid(), 'super_admin'::app_role)
  AND (
    public.is_franquia_owner(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.lojas l
      WHERE l.id = mensalidades_loja.loja_id
        AND lower(coalesce(l.cidade,'')) = lower(coalesce(public.cidade_do_franqueado(auth.uid()),''))
    )
  )
) WITH CHECK (
  public.has_role_scoped(auth.uid(), 'super_admin'::app_role)
  AND (
    public.is_franquia_owner(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.lojas l
      WHERE l.id = mensalidades_loja.loja_id
        AND lower(coalesce(l.cidade,'')) = lower(coalesce(public.cidade_do_franqueado(auth.uid()),''))
    )
  )
);

DROP POLICY IF EXISTS "Super admin vê pedidos" ON public.pedidos;
CREATE POLICY "Super admin vê pedidos" ON public.pedidos
FOR SELECT USING (
  public.has_role_scoped(auth.uid(), 'super_admin'::app_role)
  AND (public.is_franquia_owner(auth.uid()) OR public.admin_ve_loja(auth.uid(), loja_id))
);

DROP POLICY IF EXISTS "Super admin vê profiles da sua cidade" ON public.profiles;
CREATE POLICY "Super admin vê profiles da sua cidade" ON public.profiles
FOR SELECT USING (
  public.has_role_scoped(auth.uid(), 'super_admin'::app_role)
  AND (public.is_franquia_owner(auth.uid()) OR public.admin_ve_city_id(auth.uid(), city_id))
);

DROP POLICY IF EXISTS "Super admin vê entregadores sem cidade" ON public.profiles;
CREATE POLICY "Super admin vê entregadores sem cidade" ON public.profiles
FOR SELECT USING (
  public.has_role_scoped(auth.uid(), 'super_admin'::app_role)
  AND city_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = profiles.id AND ur.role = 'entregador'::app_role
  )
);

DROP POLICY IF EXISTS "Super admin vê status entregadores da sua cidade" ON public.entregador_status;
CREATE POLICY "Super admin vê status entregadores da sua cidade" ON public.entregador_status
FOR SELECT USING (
  public.has_role_scoped(auth.uid(), 'super_admin'::app_role)
  AND (public.is_franquia_owner(auth.uid()) OR public.admin_ve_profile(auth.uid(), entregador_id))
);

DROP POLICY IF EXISTS "Super admin vê status_conta da sua cidade" ON public.entregador_status_conta;
CREATE POLICY "Super admin vê status_conta da sua cidade" ON public.entregador_status_conta
FOR SELECT USING (
  public.has_role_scoped(auth.uid(), 'super_admin'::app_role)
  AND (public.is_franquia_owner(auth.uid()) OR public.admin_ve_profile(auth.uid(), entregador_id))
);

DROP POLICY IF EXISTS "Super admin insere status_conta da sua cidade" ON public.entregador_status_conta;
CREATE POLICY "Super admin insere status_conta da sua cidade" ON public.entregador_status_conta
FOR INSERT WITH CHECK (
  public.has_role_scoped(auth.uid(), 'super_admin'::app_role)
  AND (public.is_franquia_owner(auth.uid()) OR public.admin_ve_profile(auth.uid(), entregador_id))
);

DROP POLICY IF EXISTS "Super admin altera status_conta da sua cidade" ON public.entregador_status_conta;
CREATE POLICY "Super admin altera status_conta da sua cidade" ON public.entregador_status_conta
FOR UPDATE USING (
  public.has_role_scoped(auth.uid(), 'super_admin'::app_role)
  AND (public.is_franquia_owner(auth.uid()) OR public.admin_ve_profile(auth.uid(), entregador_id))
) WITH CHECK (
  public.has_role_scoped(auth.uid(), 'super_admin'::app_role)
  AND (public.is_franquia_owner(auth.uid()) OR public.admin_ve_profile(auth.uid(), entregador_id))
);

DROP POLICY IF EXISTS "Super admin vê roles da sua cidade" ON public.user_roles;
CREATE POLICY "Super admin vê roles da sua cidade" ON public.user_roles
FOR SELECT USING (
  public.has_role_scoped(auth.uid(), 'super_admin'::app_role)
  AND (public.is_franquia_owner(auth.uid()) OR public.admin_ve_profile(auth.uid(), user_id))
);

DROP POLICY IF EXISTS "Franqueado insere roles da sua cidade" ON public.user_roles;
CREATE POLICY "Franqueado insere roles da sua cidade" ON public.user_roles
FOR INSERT WITH CHECK (
  public.has_role_scoped(auth.uid(), 'super_admin'::app_role)
  AND NOT public.is_franquia_owner(auth.uid())
  AND public.admin_ve_profile(auth.uid(), user_id)
  AND role <> 'super_admin'::app_role
  AND role <> 'admin'::app_role
);

DROP POLICY IF EXISTS "Franqueado altera roles da sua cidade" ON public.user_roles;
CREATE POLICY "Franqueado altera roles da sua cidade" ON public.user_roles
FOR UPDATE USING (
  public.has_role_scoped(auth.uid(), 'super_admin'::app_role)
  AND NOT public.is_franquia_owner(auth.uid())
  AND public.admin_ve_profile(auth.uid(), user_id)
  AND role <> 'super_admin'::app_role
  AND role <> 'admin'::app_role
) WITH CHECK (
  public.has_role_scoped(auth.uid(), 'super_admin'::app_role)
  AND NOT public.is_franquia_owner(auth.uid())
  AND public.admin_ve_profile(auth.uid(), user_id)
  AND role <> 'super_admin'::app_role
  AND role <> 'admin'::app_role
);

DROP POLICY IF EXISTS "Franqueado remove roles da sua cidade" ON public.user_roles;
CREATE POLICY "Franqueado remove roles da sua cidade" ON public.user_roles
FOR DELETE USING (
  public.has_role_scoped(auth.uid(), 'super_admin'::app_role)
  AND NOT public.is_franquia_owner(auth.uid())
  AND public.admin_ve_profile(auth.uid(), user_id)
  AND role <> 'super_admin'::app_role
  AND role <> 'admin'::app_role
);

-- Revendedores: leitura/gestão escopada, inclusive no WITH CHECK (antes era aberto)
DROP POLICY IF EXISTS "Super admin gerencia revendedores" ON public.revendedores;
CREATE POLICY "Super admin gerencia revendedores" ON public.revendedores
FOR ALL USING (
  public.has_role_scoped(auth.uid(), 'super_admin'::app_role)
  AND (
    public.is_franquia_owner(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.lojas l
      WHERE l.revendedor_id = revendedores.user_id
        AND lower(coalesce(l.cidade,'')) = lower(coalesce(public.cidade_do_franqueado(auth.uid()),''))
    )
  )
) WITH CHECK (
  public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- Turnos/agendamentos e demais tabelas sensíveis permanecem com has_role estrito.
