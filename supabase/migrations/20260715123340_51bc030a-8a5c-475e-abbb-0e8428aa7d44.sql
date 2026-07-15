
ALTER TABLE public.lojas_saldo_movimentos
  DROP CONSTRAINT IF EXISTS lojas_saldo_movimentos_tipo_check;
ALTER TABLE public.lojas_saldo_movimentos
  ADD CONSTRAINT lojas_saldo_movimentos_tipo_check
  CHECK (tipo = ANY (ARRAY[
    'recarga','debito_pedido','ajuste_admin','estorno','credito_venda',
    'saque_solicitado','estorno_saque','debito_mensalidade','debito_taxa_mp','debito_taxa_pedido'
  ]));

CREATE OR REPLACE FUNCTION public.debitar_mensalidade_do_saldo(_mensalidade_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _m RECORD; _saldo numeric; _total numeric;
BEGIN
  SELECT * INTO _m FROM public.mensalidades_loja WHERE id = _mensalidade_id FOR UPDATE;
  IF NOT FOUND OR _m.pago THEN RETURN false; END IF;
  _total := COALESCE(_m.valor_total, _m.valor + COALESCE(_m.valor_tarifas_pedidos,0));
  IF _total <= 0 THEN
    UPDATE public.mensalidades_loja SET pago=true, pago_em=now(), metodo_pagamento='saldo_loja' WHERE id=_mensalidade_id;
    RETURN true;
  END IF;
  SELECT COALESCE(saldo,0) INTO _saldo FROM public.lojas_saldo WHERE loja_id=_m.loja_id;
  IF COALESCE(_saldo,0) < _total THEN RETURN false; END IF;
  PERFORM public.aplicar_movimento_loja_saldo(_m.loja_id, -_total, 'debito_mensalidade', NULL,
    'Mensalidade ' || to_char(_m.competencia,'MM/YYYY'));
  UPDATE public.mensalidades_loja SET pago=true, pago_em=now(), metodo_pagamento='saldo_loja' WHERE id=_mensalidade_id;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.processar_mensalidades_vencidas()
RETURNS TABLE(processadas integer, pagas integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _r RECORD; _proc int := 0; _pagas int := 0; _ok boolean;
BEGIN
  FOR _r IN SELECT id FROM public.mensalidades_loja WHERE pago=false AND vencimento <= CURRENT_DATE ORDER BY vencimento ASC LOOP
    _proc := _proc + 1;
    _ok := public.debitar_mensalidade_do_saldo(_r.id);
    IF _ok THEN _pagas := _pagas + 1; END IF;
  END LOOP;
  RETURN QUERY SELECT _proc, _pagas;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_mensalidade_tentar_debitar()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.pago = false AND NEW.vencimento <= CURRENT_DATE THEN
    PERFORM public.debitar_mensalidade_do_saldo(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_mensalidade_tentar_debitar ON public.mensalidades_loja;
CREATE TRIGGER trg_mensalidade_tentar_debitar
  AFTER INSERT ON public.mensalidades_loja
  FOR EACH ROW EXECUTE FUNCTION public.tg_mensalidade_tentar_debitar();

CREATE OR REPLACE FUNCTION public.loja_faturamento_resumo(_loja_id uuid, _dias integer DEFAULT 30)
RETURNS TABLE(
  periodo_dias integer,
  mensalidade_paga numeric,
  mensalidade_aberta numeric,
  taxa_pedido_total numeric,
  vendas_mp_bruto numeric,
  vendas_mp_taxa numeric,
  saques_pagos numeric,
  saldo_atual numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH j AS (SELECT (now() - make_interval(days => _dias)) AS desde)
  SELECT
    _dias,
    COALESCE((SELECT SUM(COALESCE(valor_total,valor)) FROM public.mensalidades_loja
      WHERE loja_id=_loja_id AND pago=true AND pago_em >= (SELECT desde FROM j)),0),
    COALESCE((SELECT SUM(COALESCE(valor_total,valor)) FROM public.mensalidades_loja
      WHERE loja_id=_loja_id AND pago=false),0),
    COALESCE((SELECT SUM(valor) FROM public.cobrancas_loja
      WHERE loja_id=_loja_id AND created_at >= (SELECT desde FROM j)),0),
    COALESCE((SELECT SUM(valor_total) FROM public.pedidos
      WHERE loja_id=_loja_id AND status='entregue'
        AND forma_pagamento::text IN ('pix_online','cartao_online')
        AND created_at >= (SELECT desde FROM j)),0),
    COALESCE((SELECT SUM(ABS(valor)) FROM public.lojas_saldo_movimentos
      WHERE loja_id=_loja_id AND tipo='debito_taxa_mp' AND created_at >= (SELECT desde FROM j)),0),
    COALESCE((SELECT SUM(valor) FROM public.lojas_saques
      WHERE loja_id=_loja_id AND status='pago' AND pago_em >= (SELECT desde FROM j)),0),
    COALESCE((SELECT saldo FROM public.lojas_saldo WHERE loja_id=_loja_id),0);
$$;

GRANT EXECUTE ON FUNCTION public.loja_faturamento_resumo(uuid,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.debitar_mensalidade_do_saldo(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.processar_mensalidades_vencidas() TO service_role, authenticated;

DROP FUNCTION IF EXISTS public.loja_saldo_saque_resumo(uuid);
CREATE FUNCTION public.loja_saldo_saque_resumo(_loja_id uuid)
RETURNS TABLE(
  saldo numeric,
  valor_minimo numeric,
  pode_sacar_hoje boolean,
  tem_saque_pendente boolean,
  ultimo_saque_em timestamptz,
  saldo_bruto numeric,
  reservado_mensalidade numeric,
  reservado_taxa_mp numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH ok AS (
    SELECT EXISTS (
      SELECT 1 FROM public.lojas l WHERE l.id=_loja_id
        AND (l.owner_id=auth.uid() OR public.has_role(auth.uid(),'admin'::public.app_role) OR public.has_role(auth.uid(),'super_admin'::public.app_role))
    ) AS autorizado
  ),
  bruto AS (SELECT COALESCE(saldo,0)::numeric AS v FROM public.lojas_saldo WHERE loja_id=_loja_id),
  mens AS (SELECT COALESCE(SUM(COALESCE(valor_total,valor)),0)::numeric AS v
           FROM public.mensalidades_loja WHERE loja_id=_loja_id AND pago=false),
  mp AS (SELECT COALESCE(SUM(ABS(valor)),0)::numeric AS v FROM public.lojas_saldo_movimentos
         WHERE loja_id=_loja_id AND tipo='debito_taxa_mp' AND created_at >= now() - interval '7 days'),
  ult AS (SELECT MAX(solicitado_em) AS t FROM public.lojas_saques WHERE loja_id=_loja_id AND status <> 'rejeitado'),
  liquido AS (
    SELECT GREATEST(0, COALESCE((SELECT v FROM bruto),0)
                     - COALESCE((SELECT v FROM mens),0)
                     - COALESCE((SELECT v FROM mp),0))::numeric AS v
  )
  SELECT
    (SELECT v FROM liquido),
    50::numeric,
    ((SELECT autorizado FROM ok)
      AND (SELECT v FROM liquido) >= 50
      AND NOT EXISTS (SELECT 1 FROM public.lojas_saques WHERE loja_id=_loja_id AND status IN ('solicitado','aprovado'))
      AND ((SELECT t FROM ult) IS NULL OR (SELECT t FROM ult) < now() - interval '7 days')),
    EXISTS (SELECT 1 FROM public.lojas_saques WHERE loja_id=_loja_id AND status IN ('solicitado','aprovado')),
    (SELECT t FROM ult),
    COALESCE((SELECT v FROM bruto),0),
    COALESCE((SELECT v FROM mens),0),
    COALESCE((SELECT v FROM mp),0);
$$;

GRANT EXECUTE ON FUNCTION public.loja_saldo_saque_resumo(uuid) TO authenticated;
