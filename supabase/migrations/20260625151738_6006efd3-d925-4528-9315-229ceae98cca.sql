CREATE OR REPLACE FUNCTION public.publicar_turno(_agendamento_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _a public.agendamentos%ROWTYPE;
  _loja public.lojas%ROWTYPE;
  _ttl_min integer;
  _criadas integer := 0;
  _inicio timestamptz;
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
$function$;