
-- profiles: super_admin owner vê tudo; franqueado vê só perfis da sua cidade
DROP POLICY IF EXISTS "Super admin vê todos profiles" ON public.profiles;
CREATE POLICY "Super admin vê profiles da sua cidade"
ON public.profiles FOR SELECT
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  AND (
    public.is_franquia_owner(auth.uid())
    OR lower(coalesce(profiles.cidade,'')) = lower(coalesce(public.cidade_do_franqueado(auth.uid()),''))
  )
);

-- entregador_status: idem via profile do entregador
DROP POLICY IF EXISTS "Super admin vê status entregadores" ON public.entregador_status;
CREATE POLICY "Super admin vê status entregadores da sua cidade"
ON public.entregador_status FOR SELECT
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  AND (
    public.is_franquia_owner(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = entregador_status.entregador_id
        AND lower(coalesce(p.cidade,'')) = lower(coalesce(public.cidade_do_franqueado(auth.uid()),''))
    )
  )
);

-- entregador_status_conta: idem
DROP POLICY IF EXISTS "Super admin gerencia status entregador" ON public.entregador_status_conta;
CREATE POLICY "Super admin vê status_conta da sua cidade"
ON public.entregador_status_conta FOR SELECT
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  AND (
    public.is_franquia_owner(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = entregador_status_conta.entregador_id
        AND lower(coalesce(p.cidade,'')) = lower(coalesce(public.cidade_do_franqueado(auth.uid()),''))
    )
  )
);
CREATE POLICY "Super admin altera status_conta da sua cidade"
ON public.entregador_status_conta FOR UPDATE
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  AND (
    public.is_franquia_owner(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = entregador_status_conta.entregador_id
        AND lower(coalesce(p.cidade,'')) = lower(coalesce(public.cidade_do_franqueado(auth.uid()),''))
    )
  )
);
CREATE POLICY "Super admin insere status_conta da sua cidade"
ON public.entregador_status_conta FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  AND (
    public.is_franquia_owner(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = entregador_status_conta.entregador_id
        AND lower(coalesce(p.cidade,'')) = lower(coalesce(public.cidade_do_franqueado(auth.uid()),''))
    )
  )
);

-- user_roles: franqueado só vê roles de usuários da sua cidade (mantém owner vendo tudo)
DROP POLICY IF EXISTS "Super admins can view all roles" ON public.user_roles;
CREATE POLICY "Super admin vê roles da sua cidade"
ON public.user_roles FOR SELECT
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  AND (
    public.is_franquia_owner(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = user_roles.user_id
        AND lower(coalesce(p.cidade,'')) = lower(coalesce(public.cidade_do_franqueado(auth.uid()),''))
    )
  )
);
