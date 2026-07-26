ALTER TABLE public.agendamento_aceites
  ADD COLUMN IF NOT EXISTS horas_pagas boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS motivo_nao_pagamento text,
  ADD COLUMN IF NOT EXISTS entregas_finalizadas integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS entregas_pendentes integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.concluir_turno(_agendamento_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _a public.agendamentos%ROWTYPE;
  _valor_horas numeric;
  _ac record;
  _finalizadas integer;
  _pendentes integer;
  _ja_pago boolean;
BEGIN
  SELECT * INTO _a FROM public.agendamentos WHERE id = _agendamento_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Turno não encontrado'; END IF;
  IF NOT public.is_loja_owner(auth.uid(), _a.loja_id) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  IF _a.status <> 'aceito' THEN
    RAISE EXCEPTION 'Apenas turnos aceitos podem ser concluídos';
  END IF;

  _valor_horas := ROUND(COALESCE(_a.duracao_horas, 0) * COALESCE(_a.valor_por_hora, 0), 2);

  FOR _ac IN
    SELECT entregador_id FROM public.agendamento_aceites
     WHERE agendamento_id = _agendamento_id
  LOOP
    -- Entregas distribuídas para este entregador dentro do turno
    SELECT
      COUNT(*) FILTER (WHERE p.status = 'entregue'),
      COUNT(*) FILTER (WHERE p.status NOT IN ('entregue','cancelado'))
      INTO _finalizadas, _pendentes
    FROM public.pedidos p
    WHERE p.agendamento_id = _agendamento_id
      AND p.entregador_id = _ac.entregador_id;

    SELECT EXISTS (
      SELECT 1 FROM public.entregadores_saldo_saque_movimentos m
       WHERE m.entregador_id = _ac.entregador_id
         AND m.tipo = 'credito_turno_horas'
         AND m.descricao = 'Turno agendado ' || _agendamento_id::text
    ) INTO _ja_pago;

    IF _ja_pago THEN
      UPDATE public.agendamento_aceites
         SET horas_pagas = true,
             motivo_nao_pagamento = NULL,
             entregas_finalizadas = _finalizadas,
             entregas_pendentes = _pendentes
       WHERE agendamento_id = _agendamento_id
         AND entregador_id = _ac.entregador_id;

    ELSIF _pendentes > 0 THEN
      -- Não finalizou todas as entregas do turno com o código do cliente
      UPDATE public.agendamento_aceites
         SET horas_pagas = false,
             motivo_nao_pagamento = 'Entregas do turno não finalizadas com o código do cliente ('
               || _pendentes || ' pendente(s))',
             entregas_finalizadas = _finalizadas,
             entregas_pendentes = _pendentes
       WHERE agendamento_id = _agendamento_id
         AND entregador_id = _ac.entregador_id;

    ELSE
      IF _valor_horas > 0 THEN
        PERFORM public.aplicar_movimento_entregador_saque(
          _ac.entregador_id, _valor_horas, 'credito_turno_horas', NULL, NULL,
          'Turno agendado ' || _agendamento_id::text
        );
        PERFORM public.aplicar_movimento_loja_saldo(
          _a.loja_id, -_valor_horas, 'debito_turno_horas', NULL,
          'Horas de turno agendado ' || to_char(_a.data_turno, 'DD/MM/YYYY')
        );
      END IF;

      UPDATE public.agendamento_aceites
         SET horas_pagas = true,
             motivo_nao_pagamento = NULL,
             entregas_finalizadas = _finalizadas,
             entregas_pendentes = _pendentes
       WHERE agendamento_id = _agendamento_id
         AND entregador_id = _ac.entregador_id;
    END IF;
  END LOOP;

  UPDATE public.agendamentos
     SET status = 'concluido', concluido_em = now()
   WHERE id = _agendamento_id;
END;
$function$;