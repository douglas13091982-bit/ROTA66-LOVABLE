
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
  v_padrao numeric;
BEGIN
  SELECT COALESCE(mensalidade_valor_padrao, 0) INTO v_padrao FROM config_financeiro LIMIT 1;
  SELECT COALESCE(mensalidade_valor, v_padrao, 0) INTO v_valor_base FROM lojas WHERE id = _loja_id;

  INSERT INTO mensalidades_loja(loja_id, competencia, valor, vencimento)
  VALUES (_loja_id, _competencia, v_valor_base, (_competencia + interval '1 month' - interval '1 day')::date)
  ON CONFLICT (loja_id, competencia) DO UPDATE SET valor = EXCLUDED.valor
  RETURNING id INTO v_mensalidade_id;

  UPDATE cobrancas_loja
     SET mensalidade_id = v_mensalidade_id
   WHERE loja_id = _loja_id
     AND pago = false
     AND mensalidade_id IS NULL
     AND date_trunc('month', vencimento)::date = _competencia;

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
