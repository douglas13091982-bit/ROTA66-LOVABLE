
CREATE OR REPLACE FUNCTION public.loja_solicitar_saque(_loja_id uuid, _valor numeric, _pix_chave text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _saldo numeric;
  _id uuid;
  _reserva constant numeric := 20;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF _valor IS NULL OR _valor <= 0 THEN RAISE EXCEPTION 'Valor inválido'; END IF;
  IF _pix_chave IS NULL OR length(trim(_pix_chave)) < 5 THEN
    RAISE EXCEPTION 'Informe uma chave PIX válida';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.lojas WHERE id = _loja_id AND owner_id = auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão nesta loja';
  END IF;
  IF _valor < 50 THEN RAISE EXCEPTION 'Valor mínimo de saque: R$ 50,00'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.lojas_saques
    WHERE loja_id = _loja_id AND status IN ('solicitado','aprovado')
  ) THEN
    RAISE EXCEPTION 'Já existe um saque pendente';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.lojas_saques
    WHERE loja_id = _loja_id AND status <> 'rejeitado'
      AND solicitado_em > now() - interval '7 days'
  ) THEN
    RAISE EXCEPTION 'Só é permitido 1 saque por semana';
  END IF;

  SELECT COALESCE(saldo,0) INTO _saldo FROM public.lojas_saldo WHERE loja_id = _loja_id FOR UPDATE;
  IF COALESCE(_saldo,0) < _valor THEN
    RAISE EXCEPTION 'Saldo insuficiente';
  END IF;
  IF COALESCE(_saldo,0) - _valor < _reserva THEN
    RAISE EXCEPTION 'Deixe pelo menos R$ %,00 em saldo para chamar entregadores', _reserva::int;
  END IF;

  PERFORM public.aplicar_movimento_loja_saldo(_loja_id, -_valor, 'saque_solicitado', NULL,
    'Solicitação de saque via PIX');

  INSERT INTO public.lojas_saques (loja_id, valor, pix_chave)
  VALUES (_loja_id, _valor, trim(_pix_chave))
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;
