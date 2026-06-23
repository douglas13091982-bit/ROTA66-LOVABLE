
-- Permitir movimento de transferência do saldo de corridas para créditos da mensalidade
ALTER TABLE public.entregadores_saldo_saque_movimentos
  DROP CONSTRAINT IF EXISTS entregadores_saldo_saque_movimentos_tipo_check;

ALTER TABLE public.entregadores_saldo_saque_movimentos
  ADD CONSTRAINT entregadores_saldo_saque_movimentos_tipo_check
  CHECK (tipo = ANY (ARRAY['credito_entrega'::text, 'saque'::text, 'ajuste_admin'::text, 'estorno'::text, 'transferencia_creditos'::text]));

-- RPC: entregador transfere parte do saldo de corridas para o saldo de créditos (mensalidade)
CREATE OR REPLACE FUNCTION public.entregador_pagar_mensalidade_com_saldo(_valor numeric)
RETURNS TABLE(saldo_saque numeric, saldo_creditos numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _cfg public.config_creditos_entregador%ROWTYPE;
  _saldo_saque_atual numeric;
  _novo_saque numeric;
  _novo_cred numeric;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF _valor IS NULL OR _valor <= 0 THEN RAISE EXCEPTION 'Valor inválido'; END IF;

  SELECT * INTO _cfg FROM public.config_creditos_entregador WHERE singleton = true LIMIT 1;
  IF _cfg IS NULL OR _cfg.ativo = false THEN
    RAISE EXCEPTION 'A cobrança de mensalidade não está ativa';
  END IF;

  SELECT COALESCE(saldo, 0) INTO _saldo_saque_atual
  FROM public.entregadores_saldo_saque
  WHERE entregador_id = _uid
  FOR UPDATE;

  IF COALESCE(_saldo_saque_atual, 0) < _valor THEN
    RAISE EXCEPTION 'Saldo de corridas insuficiente';
  END IF;

  -- Debita saldo de saque (movimento negativo)
  _novo_saque := public.aplicar_movimento_entregador_saque(
    _uid,
    -_valor,
    'transferencia_creditos',
    NULL,
    NULL,
    'Transferência para créditos (mensalidade)'
  );

  -- Credita saldo de créditos
  INSERT INTO public.entregador_creditos (entregador_id, saldo, updated_at)
  VALUES (_uid, _valor, now())
  ON CONFLICT (entregador_id) DO UPDATE
    SET saldo = entregador_creditos.saldo + EXCLUDED.saldo,
        updated_at = now()
  RETURNING saldo INTO _novo_cred;

  INSERT INTO public.entregador_creditos_transacoes
    (entregador_id, tipo, valor, saldo_apos, descricao, created_by)
  VALUES (
    _uid,
    'recarga'::entregador_credito_tipo,
    _valor,
    _novo_cred,
    'Transferência do saldo de corridas',
    _uid
  );

  RETURN QUERY SELECT _novo_saque, _novo_cred;
END;
$$;

GRANT EXECUTE ON FUNCTION public.entregador_pagar_mensalidade_com_saldo(numeric) TO authenticated;
