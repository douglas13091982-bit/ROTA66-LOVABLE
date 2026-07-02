
-- ============ 1. Tabelas de franquia ============

CREATE TABLE IF NOT EXISTS public.franqueados_config (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  cidade text NOT NULL,
  mensalidade_valor numeric(10,2) NOT NULL DEFAULT 0,
  dia_vencimento int NOT NULL DEFAULT 5 CHECK (dia_vencimento BETWEEN 1 AND 28),
  ativo boolean NOT NULL DEFAULT true,
  bloqueado_por_inadimplencia boolean NOT NULL DEFAULT false,
  dias_tolerancia int NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_franqueados_config_cidade ON public.franqueados_config(cidade);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.franqueados_config TO authenticated;
GRANT ALL ON public.franqueados_config TO service_role;
ALTER TABLE public.franqueados_config ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.franqueados_faturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  franqueado_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  competencia text NOT NULL, -- 'YYYY-MM'
  valor numeric(10,2) NOT NULL,
  vencimento date NOT NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','pago','vencido','cancelado')),
  mp_payment_id text,
  mp_link text,
  pago_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (franqueado_user_id, competencia)
);
CREATE INDEX IF NOT EXISTS idx_franqueados_faturas_user ON public.franqueados_faturas(franqueado_user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.franqueados_faturas TO authenticated;
GRANT ALL ON public.franqueados_faturas TO service_role;
ALTER TABLE public.franqueados_faturas ENABLE ROW LEVEL SECURITY;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.tg_franqueados_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS tg_franqueados_config_touch ON public.franqueados_config;
CREATE TRIGGER tg_franqueados_config_touch BEFORE UPDATE ON public.franqueados_config
  FOR EACH ROW EXECUTE FUNCTION public.tg_franqueados_touch();

DROP TRIGGER IF EXISTS tg_franqueados_faturas_touch ON public.franqueados_faturas;
CREATE TRIGGER tg_franqueados_faturas_touch BEFORE UPDATE ON public.franqueados_faturas
  FOR EACH ROW EXECUTE FUNCTION public.tg_franqueados_touch();

-- ============ 2. Funções helper ============

-- Owner = usuário com papel super_admin que NÃO tem registro em franqueados_config
CREATE OR REPLACE FUNCTION public.is_franquia_owner(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid AND role = 'super_admin')
     AND NOT EXISTS (SELECT 1 FROM public.franqueados_config WHERE user_id = _uid);
$$;

CREATE OR REPLACE FUNCTION public.cidade_do_franqueado(_uid uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT cidade FROM public.franqueados_config WHERE user_id = _uid;
$$;

-- Verdadeiro se o admin pode enxergar essa cidade (owner vê tudo; franqueado só a própria cidade)
CREATE OR REPLACE FUNCTION public.admin_ve_cidade(_uid uuid, _cidade text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_uid, 'super_admin'::app_role)
     AND (
       public.is_franquia_owner(_uid)
       OR lower(coalesce(_cidade,'')) = lower(coalesce(public.cidade_do_franqueado(_uid),''))
     );
$$;

-- ============ 3. Políticas franqueados_config / faturas ============

DROP POLICY IF EXISTS "Owner gerencia franqueados_config" ON public.franqueados_config;
CREATE POLICY "Owner gerencia franqueados_config" ON public.franqueados_config
  FOR ALL TO authenticated
  USING (public.is_franquia_owner(auth.uid()))
  WITH CHECK (public.is_franquia_owner(auth.uid()));

DROP POLICY IF EXISTS "Franqueado le proprio config" ON public.franqueados_config;
CREATE POLICY "Franqueado le proprio config" ON public.franqueados_config
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Owner gerencia faturas" ON public.franqueados_faturas;
CREATE POLICY "Owner gerencia faturas" ON public.franqueados_faturas
  FOR ALL TO authenticated
  USING (public.is_franquia_owner(auth.uid()))
  WITH CHECK (public.is_franquia_owner(auth.uid()));

DROP POLICY IF EXISTS "Franqueado le proprias faturas" ON public.franqueados_faturas;
CREATE POLICY "Franqueado le proprias faturas" ON public.franqueados_faturas
  FOR SELECT TO authenticated
  USING (franqueado_user_id = auth.uid());

-- ============ 4. Escopo por cidade nas tabelas operacionais ============

-- LOJAS
DROP POLICY IF EXISTS "Super admin vê todas" ON public.lojas;
CREATE POLICY "Super admin vê todas" ON public.lojas
  FOR SELECT TO authenticated
  USING (public.admin_ve_cidade(auth.uid(), cidade));

DROP POLICY IF EXISTS "Super admin gerencia lojas" ON public.lojas;
CREATE POLICY "Super admin gerencia lojas" ON public.lojas
  FOR ALL TO authenticated
  USING (public.admin_ve_cidade(auth.uid(), cidade))
  WITH CHECK (public.admin_ve_cidade(auth.uid(), cidade));

DROP POLICY IF EXISTS "Super admin deleta lojas" ON public.lojas;
CREATE POLICY "Super admin deleta lojas" ON public.lojas
  FOR DELETE TO authenticated
  USING (public.admin_ve_cidade(auth.uid(), cidade));

-- PEDIDOS (via loja)
DROP POLICY IF EXISTS "Super admin vê pedidos" ON public.pedidos;
CREATE POLICY "Super admin vê pedidos" ON public.pedidos
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    AND (
      public.is_franquia_owner(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.lojas l
        WHERE l.id = pedidos.loja_id
          AND lower(coalesce(l.cidade,'')) = lower(coalesce(public.cidade_do_franqueado(auth.uid()),''))
      )
    )
  );

-- MENSALIDADES_LOJA
DROP POLICY IF EXISTS "Super admin vê todas mensalidades" ON public.mensalidades_loja;
CREATE POLICY "Super admin vê todas mensalidades" ON public.mensalidades_loja
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    AND (
      public.is_franquia_owner(auth.uid())
      OR EXISTS (SELECT 1 FROM public.lojas l WHERE l.id = mensalidades_loja.loja_id
        AND lower(coalesce(l.cidade,'')) = lower(coalesce(public.cidade_do_franqueado(auth.uid()),'')))
    )
  );

DROP POLICY IF EXISTS "Super admin gerencia mensalidades" ON public.mensalidades_loja;
CREATE POLICY "Super admin gerencia mensalidades" ON public.mensalidades_loja
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    AND (
      public.is_franquia_owner(auth.uid())
      OR EXISTS (SELECT 1 FROM public.lojas l WHERE l.id = mensalidades_loja.loja_id
        AND lower(coalesce(l.cidade,'')) = lower(coalesce(public.cidade_do_franqueado(auth.uid()),'')))
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    AND (
      public.is_franquia_owner(auth.uid())
      OR EXISTS (SELECT 1 FROM public.lojas l WHERE l.id = mensalidades_loja.loja_id
        AND lower(coalesce(l.cidade,'')) = lower(coalesce(public.cidade_do_franqueado(auth.uid()),'')))
    )
  );

-- AGENDAMENTOS
DROP POLICY IF EXISTS "Super admin vê todos os turnos" ON public.agendamentos;
CREATE POLICY "Super admin vê todos os turnos" ON public.agendamentos
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    AND (
      public.is_franquia_owner(auth.uid())
      OR EXISTS (SELECT 1 FROM public.lojas l WHERE l.id = agendamentos.loja_id
        AND lower(coalesce(l.cidade,'')) = lower(coalesce(public.cidade_do_franqueado(auth.uid()),'')))
    )
  );

-- REVENDEDORES (franqueado vê revendedores que têm ≥1 loja na cidade dele)
DROP POLICY IF EXISTS "Super admin gerencia revendedores" ON public.revendedores;
CREATE POLICY "Super admin gerencia revendedores" ON public.revendedores
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    AND (
      public.is_franquia_owner(auth.uid())
      OR EXISTS (SELECT 1 FROM public.lojas l WHERE l.revendedor_id = revendedores.user_id
        AND lower(coalesce(l.cidade,'')) = lower(coalesce(public.cidade_do_franqueado(auth.uid()),'')))
    )
  )
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- SAQUES: só owner (mantém restrito)
DROP POLICY IF EXISTS "Super admin atualiza saques" ON public.entregador_saques;
CREATE POLICY "Super admin atualiza saques" ON public.entregador_saques
  FOR UPDATE TO authenticated
  USING (public.is_franquia_owner(auth.uid()))
  WITH CHECK (public.is_franquia_owner(auth.uid()));

DROP POLICY IF EXISTS "Admin atualiza saques" ON public.revendedor_saques;
CREATE POLICY "Admin atualiza saques" ON public.revendedor_saques
  FOR UPDATE TO authenticated
  USING (public.is_franquia_owner(auth.uid()))
  WITH CHECK (public.is_franquia_owner(auth.uid()));

-- PASSWORD RESET: só owner
DROP POLICY IF EXISTS "Admins atualizam pedidos" ON public.password_reset_requests;
CREATE POLICY "Admins atualizam pedidos" ON public.password_reset_requests
  FOR UPDATE TO authenticated
  USING (public.is_franquia_owner(auth.uid()))
  WITH CHECK (public.is_franquia_owner(auth.uid()));

DROP POLICY IF EXISTS "Admins veem todos os pedidos" ON public.password_reset_requests;
CREATE POLICY "Admins veem todos os pedidos" ON public.password_reset_requests
  FOR SELECT TO authenticated
  USING (public.is_franquia_owner(auth.uid()));

-- ============ 5. Cron: gerar faturas de franquia mensalmente ============

CREATE OR REPLACE FUNCTION public.gerar_faturas_franquia()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r record;
  comp text := to_char(now(), 'YYYY-MM');
  venc date;
  criadas int := 0;
BEGIN
  FOR r IN SELECT * FROM public.franqueados_config WHERE ativo = true LOOP
    venc := make_date(extract(year from now())::int, extract(month from now())::int, r.dia_vencimento);
    IF venc < current_date THEN venc := venc + interval '1 month'; END IF;
    INSERT INTO public.franqueados_faturas (franqueado_user_id, competencia, valor, vencimento)
    VALUES (r.user_id, comp, r.mensalidade_valor, venc)
    ON CONFLICT (franqueado_user_id, competencia) DO NOTHING;
    IF FOUND THEN criadas := criadas + 1; END IF;
  END LOOP;

  -- marca vencidas
  UPDATE public.franqueados_faturas SET status = 'vencido'
   WHERE status = 'pendente' AND vencimento < current_date;

  -- bloqueia franqueados que passaram da tolerância
  UPDATE public.franqueados_config c SET bloqueado_por_inadimplencia = true
   WHERE ativo = true
     AND EXISTS (
       SELECT 1 FROM public.franqueados_faturas f
       WHERE f.franqueado_user_id = c.user_id
         AND f.status IN ('pendente','vencido')
         AND f.vencimento < current_date - (c.dias_tolerancia || ' days')::interval
     );

  -- desbloqueia quem quitou
  UPDATE public.franqueados_config c SET bloqueado_por_inadimplencia = false
   WHERE bloqueado_por_inadimplencia = true
     AND NOT EXISTS (
       SELECT 1 FROM public.franqueados_faturas f
       WHERE f.franqueado_user_id = c.user_id
         AND f.status IN ('pendente','vencido')
         AND f.vencimento < current_date - (c.dias_tolerancia || ' days')::interval
     );

  RETURN criadas;
END; $$;

-- Agenda diariamente às 3h (idempotente)
DO $$ BEGIN
  PERFORM cron.unschedule('gerar-faturas-franquia');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule('gerar-faturas-franquia', '0 3 * * *', $$SELECT public.gerar_faturas_franquia();$$);
