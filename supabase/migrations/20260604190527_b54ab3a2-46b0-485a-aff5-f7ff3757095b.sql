
-- ============================================
-- 1. CONFIG BRANDING (logo do sistema)
-- ============================================
CREATE TABLE IF NOT EXISTS public.config_branding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  logo_data_url text,
  nome_sistema text NOT NULL DEFAULT 'ROTA 66',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.config_branding TO anon, authenticated;
GRANT ALL ON public.config_branding TO service_role;
GRANT UPDATE, INSERT ON public.config_branding TO authenticated;

ALTER TABLE public.config_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Branding público para leitura"
  ON public.config_branding FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "Super admin gerencia branding"
  ON public.config_branding FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE TRIGGER trg_config_branding_updated
  BEFORE UPDATE ON public.config_branding
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

INSERT INTO public.config_branding (singleton, nome_sistema) VALUES (true, 'ROTA 66')
  ON CONFLICT (singleton) DO NOTHING;

-- ============================================
-- 2. TARIFAS: valor minimo + valor por km
-- ============================================
ALTER TABLE public.tarifas_globais
  ADD COLUMN IF NOT EXISTS valor_minimo numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_por_km numeric NOT NULL DEFAULT 0;

-- ============================================
-- 3. LOJAS: status de moderação
-- ============================================
DO $$ BEGIN
  CREATE TYPE public.status_moderacao AS ENUM ('pendente','aprovado','bloqueado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.lojas
  ADD COLUMN IF NOT EXISTS status public.status_moderacao NOT NULL DEFAULT 'pendente';

-- Lojas existentes são aprovadas automaticamente
UPDATE public.lojas SET status = 'aprovado' WHERE status = 'pendente';

-- Restringe visibilidade pública
DROP POLICY IF EXISTS "Lojas ativas são públicas" ON public.lojas;
CREATE POLICY "Lojas ativas e aprovadas públicas"
  ON public.lojas FOR SELECT TO anon
  USING (ativa = true AND status = 'aprovado');

-- Permite super admin deletar (já tem ALL mas garante)
DROP POLICY IF EXISTS "Super admin deleta lojas" ON public.lojas;
CREATE POLICY "Super admin deleta lojas"
  ON public.lojas FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- ============================================
-- 4. ENTREGADORES: status da conta
-- ============================================
CREATE TABLE IF NOT EXISTS public.entregador_status_conta (
  entregador_id uuid PRIMARY KEY,
  status public.status_moderacao NOT NULL DEFAULT 'pendente',
  motivo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.entregador_status_conta TO authenticated;
GRANT ALL ON public.entregador_status_conta TO service_role;

ALTER TABLE public.entregador_status_conta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Entregador vê próprio status"
  ON public.entregador_status_conta FOR SELECT TO authenticated
  USING (auth.uid() = entregador_id);

CREATE POLICY "Loja vê status dos vinculados"
  ON public.entregador_status_conta FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.loja_entregadores le
    WHERE le.entregador_id = entregador_status_conta.entregador_id
      AND public.is_loja_owner(auth.uid(), le.loja_id)
  ));

CREATE POLICY "Super admin gerencia status entregador"
  ON public.entregador_status_conta FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE TRIGGER trg_entregador_status_updated
  BEFORE UPDATE ON public.entregador_status_conta
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Backfill: entregadores existentes ficam aprovados
INSERT INTO public.entregador_status_conta (entregador_id, status)
SELECT user_id, 'aprovado'::public.status_moderacao
FROM public.user_roles
WHERE role = 'entregador'::public.app_role
ON CONFLICT (entregador_id) DO NOTHING;

-- Função auxiliar
CREATE OR REPLACE FUNCTION public.is_entregador_aprovado(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.entregador_status_conta
    WHERE entregador_id = _user_id AND status = 'aprovado'
  );
$$;

-- Atualiza trigger handle_new_user para criar registro de status quando role é entregador
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  _role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'phone'
  );

  BEGIN
    _role := COALESCE((NEW.raw_user_meta_data ->> 'role')::public.app_role, 'cliente'::public.app_role);
  EXCEPTION WHEN others THEN
    _role := 'cliente'::public.app_role;
  END;

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

-- Restringe vinculação de entregadores não aprovados
DROP POLICY IF EXISTS "Dono gerencia entregadores" ON public.loja_entregadores;
CREATE POLICY "Dono gerencia entregadores"
  ON public.loja_entregadores FOR ALL TO authenticated
  USING (public.is_loja_owner(auth.uid(), loja_id))
  WITH CHECK (
    public.is_loja_owner(auth.uid(), loja_id)
    AND public.is_entregador_aprovado(entregador_id)
  );
