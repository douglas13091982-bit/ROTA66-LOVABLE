
-- 1) Desativar trigger por pedido
DROP TRIGGER IF EXISTS trg_gerar_cobranca_pedido_entregue ON public.pedidos;
DROP TRIGGER IF EXISTS trg_pedidos_gerar_cobranca ON public.pedidos;

-- 2) Ajustes em cobrancas_loja para suportar cobrança consolidada por período
ALTER TABLE public.cobrancas_loja
  ALTER COLUMN pedido_id DROP NOT NULL;

ALTER TABLE public.cobrancas_loja
  ADD COLUMN IF NOT EXISTS periodo_inicio date,
  ADD COLUMN IF NOT EXISTS periodo_fim date,
  ADD COLUMN IF NOT EXISTS qtd_pedidos integer;

-- Evita duplicar a cobrança semanal de uma loja para o mesmo período
CREATE UNIQUE INDEX IF NOT EXISTS uq_cobrancas_loja_periodo
  ON public.cobrancas_loja (loja_id, periodo_inicio, periodo_fim)
  WHERE periodo_inicio IS NOT NULL AND periodo_fim IS NOT NULL;

-- 3) Função semanal
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.gerar_cobrancas_semanais_lojas()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cfg public.config_financeiro%ROWTYPE;
  _hoje date := CURRENT_DATE;
  -- Semana anterior: segunda-feira a domingo
  _inicio date := (date_trunc('week', _hoje)::date - INTERVAL '7 days')::date;
  _fim date := (date_trunc('week', _hoje)::date - INTERVAL '1 day')::date;
  _prazo integer;
  _venc timestamptz;
  _loja record;
  _qtd integer;
  _taxa numeric;
  _valor numeric;
  _count integer := 0;
BEGIN
  SELECT * INTO _cfg FROM public.config_financeiro WHERE singleton = true LIMIT 1;
  _prazo := COALESCE(_cfg.prazo_pagamento_dias, 7);
  _venc := (_hoje + (_prazo || ' days')::interval);

  FOR _loja IN
    SELECT id, taxa_por_pedido, plano_mensal_ativo
    FROM public.lojas
    WHERE status = 'aprovado'::status_moderacao
      AND COALESCE(plano_mensal_ativo, false) = false
      AND COALESCE(taxa_por_pedido, 0) > 0
  LOOP
    _taxa := _loja.taxa_por_pedido;

    SELECT COUNT(*) INTO _qtd
    FROM public.pedidos p
    WHERE p.loja_id = _loja.id
      AND p.status = 'entregue'
      AND p.entregue_em IS NOT NULL
      AND p.entregue_em::date BETWEEN _inicio AND _fim;

    IF _qtd = 0 THEN CONTINUE; END IF;

    _valor := _taxa * _qtd;

    INSERT INTO public.cobrancas_loja
      (loja_id, pedido_id, valor, vencimento, pago, periodo_inicio, periodo_fim, qtd_pedidos)
    VALUES
      (_loja.id, NULL, _valor, _venc, false, _inicio, _fim, _qtd)
    ON CONFLICT (loja_id, periodo_inicio, periodo_fim) DO NOTHING;

    IF FOUND THEN _count := _count + 1; END IF;
  END LOOP;

  RETURN _count;
END;
$$;

-- 4) Agendar cron semanal (segunda 03:10 UTC ≈ 00:10 BRT)
DO $$
BEGIN
  PERFORM cron.unschedule('gerar-cobrancas-semanais');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'gerar-cobrancas-semanais',
  '10 3 * * 1',
  $$ SELECT public.gerar_cobrancas_semanais_lojas(); $$
);
