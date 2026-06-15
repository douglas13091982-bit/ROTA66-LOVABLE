CREATE OR REPLACE FUNCTION public.desmarcar_turno_entregador(_agendamento_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _a public.agendamentos%ROWTYPE;
  _inicio timestamptz;
BEGIN
  SELECT * INTO _a FROM public.agendamentos WHERE id = _agendamento_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Turno não encontrado'; END IF;
  IF _a.entregador_id IS NULL OR _a.entregador_id <> auth.uid() THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  IF _a.status <> 'aceito' THEN
    RAISE EXCEPTION 'Apenas turnos aceitos podem ser desmarcados';
  END IF;

  _inicio := (_a.data_turno + _a.hora_inicio) AT TIME ZONE 'America/Sao_Paulo';
  IF _inicio < now() THEN
    RAISE EXCEPTION 'Não é possível desmarcar um turno que já começou';
  END IF;

  UPDATE public.agendamentos
     SET entregador_id = NULL,
         status = 'publicado',
         aceito_em = NULL
   WHERE id = _agendamento_id;

  -- Marca a oferta antiga como expirada e republicar para outros entregadores
  UPDATE public.agendamento_ofertas
     SET status = 'expirado'
   WHERE agendamento_id = _agendamento_id
     AND status = 'aceito'
     AND entregador_id = auth.uid();

  -- Reabre ofertas ativas para os outros entregadores aprovados
  INSERT INTO public.agendamento_ofertas (agendamento_id, entregador_id, expira_em)
  SELECT _a.id, pr.id, _inicio
    FROM public.profiles pr
   WHERE pr.aceita_pedidos_externos = true
     AND pr.id <> auth.uid()
     AND public.is_entregador_aprovado(pr.id)
  ON CONFLICT (agendamento_id, entregador_id) DO UPDATE
    SET status = 'ativo',
        expira_em = EXCLUDED.expira_em;
END;
$$;