
-- ============================================================
-- Pagamentos da plataforma via Mercado Pago
-- Mensalidades e tarifas por pedido pagas pela loja para ROTA 66
-- ============================================================

-- 1. Colunas MP em mensalidades_loja
ALTER TABLE public.mensalidades_loja
  ADD COLUMN IF NOT EXISTS valor_tarifas_pedidos numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_total numeric GENERATED ALWAYS AS (valor + valor_tarifas_pedidos) STORED,
  ADD COLUMN IF NOT EXISTS metodo_pagamento text,
  ADD COLUMN IF NOT EXISTS mp_payment_id text,
  ADD COLUMN IF NOT EXISTS mp_payment_status text,
  ADD COLUMN IF NOT EXISTS mp_qr_code text,
  ADD COLUMN IF NOT EXISTS mp_qr_code_base64 text,
  ADD COLUMN IF NOT EXISTS mp_ticket_url text,
  ADD COLUMN IF NOT EXISTS mp_pix_expira_em timestamptz;

-- 2. Colunas em cobrancas_loja: flag de consolidação na mensalidade
ALTER TABLE public.cobrancas_loja
  ADD COLUMN IF NOT EXISTS mensalidade_id uuid REFERENCES public.mensalidades_loja(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS cobrancas_loja_mensalidade_idx ON public.cobrancas_loja(mensalidade_id);

-- 3. RPC: gerar/atualizar a mensalidade do mês de uma loja somando todas as cobranças (tarifas por pedido) não pagas
CREATE OR REPLACE FUNCTION public.consolidar_mensalidade_loja(_loja_id uuid, _competencia date DEFAULT date_trunc('month', now())::date)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mensalidade_id uuid;
  v_valor_base numeric;
  v_total_tarifas numeric;
BEGIN
  -- Valor base = plano da loja (placeholder: usa plano_mensal_valor se existir, senão 0)
  SELECT COALESCE((SELECT plano_mensal_valor FROM lojas WHERE id = _loja_id), 0)
    INTO v_valor_base;

  -- Cria mensalidade se não existir
  INSERT INTO mensalidades_loja(loja_id, competencia, valor, vencimento)
  VALUES (_loja_id, _competencia, v_valor_base, (_competencia + interval '1 month' - interval '1 day')::date)
  ON CONFLICT (loja_id, competencia) DO UPDATE SET valor = EXCLUDED.valor
  RETURNING id INTO v_mensalidade_id;

  -- Associa cobranças não pagas e ainda não associadas dessa loja com vencimento dentro da competência
  UPDATE cobrancas_loja
     SET mensalidade_id = v_mensalidade_id
   WHERE loja_id = _loja_id
     AND pago = false
     AND mensalidade_id IS NULL
     AND date_trunc('month', vencimento)::date = _competencia;

  -- Soma das tarifas consolidadas
  SELECT COALESCE(SUM(valor), 0) INTO v_total_tarifas
    FROM cobrancas_loja
   WHERE mensalidade_id = v_mensalidade_id;

  UPDATE mensalidades_loja
     SET valor_tarifas_pedidos = v_total_tarifas,
         updated_at = now()
   WHERE id = v_mensalidade_id;

  RETURN v_mensalidade_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.consolidar_mensalidade_loja(uuid, date) TO authenticated, service_role;

-- 4. Trigger: quando mensalidade é marcada como paga, marcar cobranças vinculadas como pagas também
CREATE OR REPLACE FUNCTION public.propagar_pagamento_mensalidade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.pago = true AND (OLD.pago IS DISTINCT FROM NEW.pago) THEN
    UPDATE cobrancas_loja
       SET pago = true, pago_em = COALESCE(NEW.pago_em, now())
     WHERE mensalidade_id = NEW.id AND pago = false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_propagar_pagamento_mensalidade ON public.mensalidades_loja;
CREATE TRIGGER trg_propagar_pagamento_mensalidade
  AFTER UPDATE OF pago ON public.mensalidades_loja
  FOR EACH ROW EXECUTE FUNCTION public.propagar_pagamento_mensalidade();

-- 5. Relaxar trigger de update guard para permitir gravação de campos MP pelo service_role
-- (a função já existe; não vamos mexer nela aqui — server functions usam supabaseAdmin que bypassa RLS,
-- mas o trigger de guard pode bloquear. Vamos verificar e ajustar.)
CREATE OR REPLACE FUNCTION public.mensalidades_loja_update_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Super admin ou service_role podem mudar qualquer coisa
  IF auth.role() = 'service_role' OR public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RETURN NEW;
  END IF;
  -- Dono da loja só pode setar pago_solicitado_em
  IF NEW.pago IS DISTINCT FROM OLD.pago
     OR NEW.pago_em IS DISTINCT FROM OLD.pago_em
     OR NEW.valor IS DISTINCT FROM OLD.valor
     OR NEW.vencimento IS DISTINCT FROM OLD.vencimento
     OR NEW.competencia IS DISTINCT FROM OLD.competencia
     OR NEW.loja_id IS DISTINCT FROM OLD.loja_id THEN
    RAISE EXCEPTION 'Sem permissão para alterar estes campos';
  END IF;
  RETURN NEW;
END;
$$;
