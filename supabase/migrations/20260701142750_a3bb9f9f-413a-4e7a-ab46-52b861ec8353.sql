
-- Helper updated_at (idempotente)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $fn$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$fn$;

-- 1. Novo papel
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'revendedor';

-- 2. Tabela revendedores
CREATE TABLE IF NOT EXISTS public.revendedores (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  documento text,
  telefone text,
  email text NOT NULL,
  mensalidade_valor numeric(10,2) NOT NULL DEFAULT 0,
  percentual_receita numeric(5,2) NOT NULL DEFAULT 0 CHECK (percentual_receita >= 0 AND percentual_receita <= 100),
  dia_vencimento integer NOT NULL DEFAULT 5 CHECK (dia_vencimento BETWEEN 1 AND 28),
  ativo boolean NOT NULL DEFAULT true,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.revendedores TO authenticated;
GRANT ALL ON public.revendedores TO service_role;
ALTER TABLE public.revendedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin gerencia revendedores"
  ON public.revendedores FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "Revendedor le proprio perfil"
  ON public.revendedores FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 3. Loja -> revendedor
ALTER TABLE public.lojas
  ADD COLUMN IF NOT EXISTS revendedor_id uuid REFERENCES public.revendedores(user_id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_lojas_revendedor ON public.lojas(revendedor_id);

-- 4. Helper
CREATE OR REPLACE FUNCTION public.is_revendedor_da_loja(_loja_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.lojas WHERE id = _loja_id AND revendedor_id = auth.uid()
  );
$fn$;

-- 5. Policies
CREATE POLICY "Revendedor le suas lojas"
  ON public.lojas FOR SELECT TO authenticated
  USING (revendedor_id = auth.uid());
CREATE POLICY "Revendedor edita suas lojas"
  ON public.lojas FOR UPDATE TO authenticated
  USING (revendedor_id = auth.uid()) WITH CHECK (revendedor_id = auth.uid());
CREATE POLICY "Revendedor le produtos das suas lojas"
  ON public.produtos FOR SELECT TO authenticated
  USING (public.is_revendedor_da_loja(loja_id));
CREATE POLICY "Revendedor le pedidos das suas lojas"
  ON public.pedidos FOR SELECT TO authenticated
  USING (loja_id IS NOT NULL AND public.is_revendedor_da_loja(loja_id));
CREATE POLICY "Revendedor le mensalidades das suas lojas"
  ON public.mensalidades_loja FOR SELECT TO authenticated
  USING (public.is_revendedor_da_loja(loja_id));
CREATE POLICY "Revendedor le cobrancas das suas lojas"
  ON public.cobrancas_loja FOR SELECT TO authenticated
  USING (public.is_revendedor_da_loja(loja_id));
CREATE POLICY "Revendedor le saldo das suas lojas"
  ON public.lojas_saldo FOR SELECT TO authenticated
  USING (public.is_revendedor_da_loja(loja_id));
CREATE POLICY "Revendedor le agendamentos das suas lojas"
  ON public.agendamentos FOR SELECT TO authenticated
  USING (public.is_revendedor_da_loja(loja_id));

-- 6. Cobrancas do revendedor
CREATE TABLE IF NOT EXISTS public.revendedor_cobrancas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  revendedor_id uuid NOT NULL REFERENCES public.revendedores(user_id) ON DELETE CASCADE,
  competencia date NOT NULL,
  valor_mensalidade numeric(10,2) NOT NULL DEFAULT 0,
  valor_percentual numeric(10,2) NOT NULL DEFAULT 0,
  receita_base numeric(10,2) NOT NULL DEFAULT 0,
  valor_total numeric(10,2) GENERATED ALWAYS AS (valor_mensalidade + valor_percentual) STORED,
  vencimento date NOT NULL,
  pago boolean NOT NULL DEFAULT false,
  pago_em timestamptz,
  metodo_pagamento text,
  mp_payment_id text,
  mp_payment_status text,
  mp_qr_code text,
  mp_qr_code_base64 text,
  mp_ticket_url text,
  mp_pix_expira_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(revendedor_id, competencia)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.revendedor_cobrancas TO authenticated;
GRANT ALL ON public.revendedor_cobrancas TO service_role;
ALTER TABLE public.revendedor_cobrancas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin gerencia cobrancas revendedor"
  ON public.revendedor_cobrancas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));
CREATE POLICY "Revendedor le suas cobrancas"
  ON public.revendedor_cobrancas FOR SELECT TO authenticated
  USING (revendedor_id = auth.uid());

CREATE TRIGGER trg_revendedores_updated_at
  BEFORE UPDATE ON public.revendedores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_revendedor_cobrancas_updated_at
  BEFORE UPDATE ON public.revendedor_cobrancas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Funcao mensal
CREATE OR REPLACE FUNCTION public.gerar_cobrancas_revendedores_mensal()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_comp date := date_trunc('month', now())::date;
  v_ini date := (date_trunc('month', now()) - interval '1 month')::date;
  v_fim date := (date_trunc('month', now()))::date;
  r record; v_receita numeric; v_percentual numeric;
BEGIN
  FOR r IN SELECT * FROM public.revendedores WHERE ativo LOOP
    SELECT COALESCE(SUM(m.valor_total),0) INTO v_receita
      FROM public.mensalidades_loja m
      JOIN public.lojas l ON l.id = m.loja_id
     WHERE l.revendedor_id = r.user_id AND m.pago = true
       AND m.pago_em >= v_ini AND m.pago_em < v_fim;
    v_percentual := ROUND(v_receita * r.percentual_receita / 100.0, 2);
    INSERT INTO public.revendedor_cobrancas(
      revendedor_id, competencia, valor_mensalidade, valor_percentual, receita_base, vencimento
    ) VALUES (
      r.user_id, v_comp, r.mensalidade_valor, v_percentual, v_receita,
      make_date(extract(year from v_comp)::int, extract(month from v_comp)::int, r.dia_vencimento)
    ) ON CONFLICT (revendedor_id, competencia) DO NOTHING;
  END LOOP;
END;
$fn$;

DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname='gerar-cobrancas-revendedores-mensal') THEN
      PERFORM cron.unschedule('gerar-cobrancas-revendedores-mensal');
    END IF;
    PERFORM cron.schedule('gerar-cobrancas-revendedores-mensal','0 3 1 * *','SELECT public.gerar_cobrancas_revendedores_mensal();');
  END IF;
END $do$;
