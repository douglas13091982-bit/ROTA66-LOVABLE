CREATE OR REPLACE FUNCTION public.turnos_valor_comprometido(_loja_id uuid, _excluir_id uuid DEFAULT NULL)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(a.valor_por_hora * a.duracao_horas * GREATEST(a.vagas_total, 1)), 0)
    FROM public.agendamentos a
   WHERE a.loja_id = _loja_id
     AND a.status IN ('publicado', 'aceito')
     AND (_excluir_id IS NULL OR a.id <> _excluir_id);
$$;

GRANT EXECUTE ON FUNCTION public.turnos_valor_comprometido(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.publicar_turno(_agendamento_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _a public.agendamentos%ROWTYPE;
  _loja public.lojas%ROWTYPE;
  _ttl_min integer;
  _criadas integer := 0;
  _inicio timestamptz;
  _saldo numeric;
  _custo numeric;
  _comprometido numeric;
BEGIN
  SELECT * INTO _a FROM public.agendamentos WHERE id = _agendamento_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Turno não encontrado'; END IF;

  IF NOT public.is_loja_owner(auth.uid(), _a.loja_id) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  IF _a.status <> 'rascunho' THEN
    RAISE EXCEPTION 'Turno já foi publicado ou processado';
  END IF;

  SELECT * INTO _loja FROM public.lojas WHERE id = _a.loja_id;
  IF NOT (
    COALESCE(_loja.plano_mensal_ativo, false)
    OR COALESCE(_loja.mensalidade_valor, 0) > 0
    OR _loja.plano_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Turnos disponíveis apenas para lojas com plano mensal ativo';
  END IF;

  _inicio := (_a.data_turno + _a.hora_inicio) AT TIME ZONE 'America/Sao_Paulo';
  IF _inicio < now() THEN
    RAISE EXCEPTION 'O turno deve começar no futuro';
  END IF;

  -- Saldo suficiente para garantir o pagamento de TODOS os entregadores do turno
  _custo := COALESCE(_a.valor_por_hora, 0) * COALESCE(_a.duracao_horas, 0) * GREATEST(COALESCE(_a.vagas_total, 1), 1);
  _comprometido := public.turnos_valor_comprometido(_a.loja_id, _a.id);
  SELECT COALESCE(saldo, 0) INTO _saldo FROM public.lojas_saldo WHERE loja_id = _a.loja_id;
  _saldo := COALESCE(_saldo, 0);

  IF _saldo < (_custo + _comprometido) THEN
    RAISE EXCEPTION 'Saldo insuficiente para publicar este turno. Necessário R$ % (garantido do turno R$ % + R$ % já comprometido em outros turnos) e seu saldo é R$ %. Recarregue sua carteira.',
      to_char(_custo + _comprometido, 'FM999999990.00'),
      to_char(_custo, 'FM999999990.00'),
      to_char(_comprometido, 'FM999999990.00'),
      to_char(_saldo, 'FM999999990.00');
  END IF;

  SELECT entregador_online_ttl_min INTO _ttl_min
    FROM public.config_roteirizacao WHERE singleton = true LIMIT 1;
  _ttl_min := COALESCE(_ttl_min, 10);

  INSERT INTO public.agendamento_ofertas (agendamento_id, entregador_id, expira_em)
  SELECT _a.id, pr.id, _inicio
    FROM public.profiles pr
   WHERE pr.aceita_pedidos_externos = true
     AND public.is_entregador_aprovado(pr.id)
  ON CONFLICT (agendamento_id, entregador_id) DO NOTHING;

  GET DIAGNOSTICS _criadas = ROW_COUNT;

  UPDATE public.agendamentos
     SET status = 'publicado', publicado_em = now()
   WHERE id = _agendamento_id;

  RETURN _criadas;
END;
$$;