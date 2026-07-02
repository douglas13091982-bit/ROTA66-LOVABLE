-- Corrige helpers de franquia para não tratar cidade vazia/nula como cidade válida
CREATE OR REPLACE FUNCTION public.admin_ve_city_id(_uid uuid, _city_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_uid, 'super_admin'::app_role)
     AND (
       public.is_franquia_owner(_uid)
       OR (
         _city_id IS NOT NULL
         AND public.cidade_id_do_franqueado(_uid) IS NOT NULL
         AND _city_id = public.cidade_id_do_franqueado(_uid)
       )
     );
$$;

CREATE OR REPLACE FUNCTION public.admin_ve_profile(_uid uuid, _profile_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_uid, 'super_admin'::app_role)
     AND (
       public.is_franquia_owner(_uid)
       OR EXISTS (
         SELECT 1
         FROM public.profiles p
         JOIN public.franqueados_config f ON f.user_id = _uid
         WHERE p.id = _profile_id
           AND p.city_id IS NOT NULL
           AND f.city_id IS NOT NULL
           AND p.city_id = f.city_id
       )
     );
$$;

CREATE OR REPLACE FUNCTION public.admin_ve_loja(_uid uuid, _loja_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_uid, 'super_admin'::app_role)
     AND (
       public.is_franquia_owner(_uid)
       OR EXISTS (
         SELECT 1
         FROM public.lojas l
         JOIN public.franqueados_config f ON f.user_id = _uid
         WHERE l.id = _loja_id
           AND l.city_id IS NOT NULL
           AND f.city_id IS NOT NULL
           AND l.city_id = f.city_id
       )
     );
$$;

-- Perfis: franqueado só enxerga profiles com city_id igual ao city_id autorizado
DROP POLICY IF EXISTS "Super admin vê profiles da sua cidade" ON public.profiles;
DROP POLICY IF EXISTS "Super admin vê todos profiles" ON public.profiles;
CREATE POLICY "Super admin vê profiles da sua cidade"
ON public.profiles FOR SELECT
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  AND (
    public.is_franquia_owner(auth.uid())
    OR public.admin_ve_city_id(auth.uid(), profiles.city_id)
  )
);

-- Status em tempo real do entregador: filtra pelo city_id do profile do entregador
DROP POLICY IF EXISTS "Super admin vê status entregadores" ON public.entregador_status;
DROP POLICY IF EXISTS "Super admin vê status entregadores da sua cidade" ON public.entregador_status;
CREATE POLICY "Super admin vê status entregadores da sua cidade"
ON public.entregador_status FOR SELECT
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  AND (
    public.is_franquia_owner(auth.uid())
    OR public.admin_ve_profile(auth.uid(), entregador_status.entregador_id)
  )
);

-- Status de aprovação/bloqueio do entregador: filtra pelo city_id do profile do entregador
DROP POLICY IF EXISTS "Super admin gerencia status entregador" ON public.entregador_status_conta;
DROP POLICY IF EXISTS "Super admin vê status_conta da sua cidade" ON public.entregador_status_conta;
DROP POLICY IF EXISTS "Super admin altera status_conta da sua cidade" ON public.entregador_status_conta;
DROP POLICY IF EXISTS "Super admin insere status_conta da sua cidade" ON public.entregador_status_conta;

CREATE POLICY "Super admin vê status_conta da sua cidade"
ON public.entregador_status_conta FOR SELECT
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  AND (
    public.is_franquia_owner(auth.uid())
    OR public.admin_ve_profile(auth.uid(), entregador_status_conta.entregador_id)
  )
);

CREATE POLICY "Super admin altera status_conta da sua cidade"
ON public.entregador_status_conta FOR UPDATE
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  AND (
    public.is_franquia_owner(auth.uid())
    OR public.admin_ve_profile(auth.uid(), entregador_status_conta.entregador_id)
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  AND (
    public.is_franquia_owner(auth.uid())
    OR public.admin_ve_profile(auth.uid(), entregador_status_conta.entregador_id)
  )
);

CREATE POLICY "Super admin insere status_conta da sua cidade"
ON public.entregador_status_conta FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  AND (
    public.is_franquia_owner(auth.uid())
    OR public.admin_ve_profile(auth.uid(), entregador_status_conta.entregador_id)
  )
);

-- Funções/papéis: remove a regra ampla que fazia todo super_admin ver todos os entregadores
DROP POLICY IF EXISTS "Super admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admin vê roles da sua cidade" ON public.user_roles;
DROP POLICY IF EXISTS "Owner gerencia todas roles" ON public.user_roles;
DROP POLICY IF EXISTS "Franqueado insere roles da sua cidade" ON public.user_roles;
DROP POLICY IF EXISTS "Franqueado altera roles da sua cidade" ON public.user_roles;
DROP POLICY IF EXISTS "Franqueado remove roles da sua cidade" ON public.user_roles;

CREATE POLICY "Super admin vê roles da sua cidade"
ON public.user_roles FOR SELECT
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  AND (
    public.is_franquia_owner(auth.uid())
    OR public.admin_ve_profile(auth.uid(), user_roles.user_id)
  )
);

CREATE POLICY "Owner gerencia todas roles"
ON public.user_roles FOR ALL
USING (public.is_franquia_owner(auth.uid()))
WITH CHECK (public.is_franquia_owner(auth.uid()));

CREATE POLICY "Franqueado insere roles da sua cidade"
ON public.user_roles FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  AND NOT public.is_franquia_owner(auth.uid())
  AND public.admin_ve_profile(auth.uid(), user_roles.user_id)
);

CREATE POLICY "Franqueado altera roles da sua cidade"
ON public.user_roles FOR UPDATE
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  AND NOT public.is_franquia_owner(auth.uid())
  AND public.admin_ve_profile(auth.uid(), user_roles.user_id)
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  AND NOT public.is_franquia_owner(auth.uid())
  AND public.admin_ve_profile(auth.uid(), user_roles.user_id)
);

CREATE POLICY "Franqueado remove roles da sua cidade"
ON public.user_roles FOR DELETE
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  AND NOT public.is_franquia_owner(auth.uid())
  AND public.admin_ve_profile(auth.uid(), user_roles.user_id)
);

-- Lojas: franqueado só vê/gerencia lojas com city_id igual ao autorizado
DROP POLICY IF EXISTS "Super admin vê todas" ON public.lojas;
DROP POLICY IF EXISTS "Super admin gerencia lojas" ON public.lojas;
DROP POLICY IF EXISTS "Super admin deleta lojas" ON public.lojas;
DROP POLICY IF EXISTS "Super admin vê lojas da sua cidade" ON public.lojas;

CREATE POLICY "Super admin vê lojas da sua cidade"
ON public.lojas FOR SELECT TO authenticated
USING (public.admin_ve_city_id(auth.uid(), lojas.city_id));

CREATE POLICY "Super admin gerencia lojas"
ON public.lojas FOR ALL TO authenticated
USING (public.admin_ve_city_id(auth.uid(), lojas.city_id))
WITH CHECK (public.admin_ve_city_id(auth.uid(), lojas.city_id));

CREATE POLICY "Super admin deleta lojas"
ON public.lojas FOR DELETE TO authenticated
USING (public.admin_ve_city_id(auth.uid(), lojas.city_id));

-- Pedidos: franqueado só vê pedidos de lojas com city_id igual ao autorizado
DROP POLICY IF EXISTS "Super admin vê pedidos" ON public.pedidos;
CREATE POLICY "Super admin vê pedidos"
ON public.pedidos FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  AND (
    public.is_franquia_owner(auth.uid())
    OR public.admin_ve_loja(auth.uid(), pedidos.loja_id)
  )
);