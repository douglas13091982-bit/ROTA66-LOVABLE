-- 1. Colunas de vínculo do pedido com o turno
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS agendamento_id uuid REFERENCES public.agendamentos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS taxa_turno_entregador numeric;

CREATE INDEX IF NOT EXISTS idx_pedidos_agendamento ON public.pedidos(agendamento_id);

-- 2. Tipos de movimento novos
ALTER TABLE public.entregadores_saldo_saque_movimentos
  DROP CONSTRAINT IF EXISTS entregadores_saldo_saque_movimentos_tipo_check;
ALTER TABLE public.entregadores_saldo_saque_movimentos
  ADD CONSTRAINT entregadores_saldo_saque_movimentos_tipo_check
  CHECK (tipo = ANY (ARRAY['credito_entrega','saque','ajuste_admin','estorno','transferencia_creditos','credito_turno_horas']));

ALTER TABLE public.lojas_saldo_movimentos
  DROP CONSTRAINT IF EXISTS lojas_saldo_movimentos_tipo_check;
ALTER TABLE public.lojas_saldo_movimentos
  ADD CONSTRAINT lojas_saldo_movimentos_tipo_check
  CHECK (tipo = ANY (ARRAY['recarga','debito_pedido','ajuste_admin','estorno','credito_venda','saque_solicitado','estorno_saque','debito_mensalidade','debito_taxa_mp','debito_taxa_pedido','debito_taxa_marketplace','debito_turno_horas']));

-- 3. Atribuição automática de pedidos ao entregador do turno ativo
CREATE OR REPLACE FUNCTION public.atribuir_pedido_turno()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _turno record;
  _ent uuid;
  _saldo numeric;
BEGIN
  -- Só interessa pedido entrando no pool (pronto, sem entregador)
  IF NEW.status <> 'pronto'::pedido_status OR NEW.entregador_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'pronto'::pedido_status AND OLD.entregador_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Turno ativo agora para esta loja
  SELECT a.id, a.taxa_por_entrega
    INTO _turno
    FROM public.agendamentos a
   WHERE a.loja_id = NEW.loja_id
     AND a.status IN ('publicado','aceito')
     AND ((a.data_turno + a.hora_inicio) AT TIME ZONE 'America/Sao_Paulo') <= now()
     AND ((a.data_turno + a.hora_inicio) AT TIME ZONE 'America/Sao_Paulo')
         + make_interval(mins => (COALESCE(a.duracao_horas, 0) * 60)::int) > now()
   ORDER BY a.data_turno DESC, a.hora_inicio DESC
   LIMIT 1;

  IF _turno.id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Entregador do turno que esteja LIVRE (sem pedido ativo), o que tem menos
  -- entregas neste turno primeiro
  SELECT ac.entregador_id
    INTO _ent
    FROM public.agendamento_aceites ac
   WHERE ac.agendamento_id = _turno.id
     AND public.is_entregador_aprovado(ac.entregador_id)
     AND NOT EXISTS (
       SELECT 1 FROM public.pedidos p
        WHERE p.entregador_id = ac.entregador_id
          AND p.status IN ('em_rota'::pedido_status, 'coletado'::pedido_status)
     )
   ORDER BY (
     SELECT COUNT(*) FROM public.pedidos p2
      WHERE p2.agendamento_id = _turno.id
        AND p2.entregador_id = ac.entregador_id
   ) ASC, ac.aceito_em ASC
   LIMIT 1;

  IF _ent IS NULL THEN
    RETURN NEW;
  END IF;

  -- Garante que a loja tem saldo para a taxa por entrega do turno
  SELECT COALESCE(saldo, 0) INTO _saldo FROM public.lojas_saldo WHERE loja_id = NEW.loja_id;
  IF COALESCE(_saldo, 0) < COALESCE(_turno.taxa_por_entrega, 0) THEN
    RETURN NEW;
  END IF;

  NEW.agendamento_id := _turno.id;
  NEW.taxa_turno_entregador := COALESCE(_turno.taxa_por_entrega, 0);
  NEW.entregador_id := _ent;
  NEW.status := 'em_rota'::pedido_status;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_atribuir_pedido_turno ON public.pedidos;
CREATE TRIGGER trg_atribuir_pedido_turno
BEFORE INSERT OR UPDATE ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION public.atribuir_pedido_turno();

-- 4. Pagamento: pedido de turno paga a taxa por entrega do turno
CREATE OR REPLACE FUNCTION public.processar_saldos_pedido_entregue()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _frete_entregador numeric;
  _taxa_entregador numeric;
  _eh_cartao boolean;
BEGIN
  IF NEW.status = 'entregue'::pedido_status
     AND (OLD.status IS DISTINCT FROM NEW.status)
     AND NEW.entregador_id IS NOT NULL THEN

    IF NEW.agendamento_id IS NOT NULL THEN
      -- Pedido de turno agendado: entregador recebe a taxa por entrega
      -- definida no turno (as horas são pagas na conclusão do turno).
      _frete_entregador := GREATEST(COALESCE(NEW.taxa_turno_entregador, 0), 0);
    ELSE
      _frete_entregador := GREATEST(
        COALESCE(NEW.taxa_entrega, 0) - COALESCE(NEW.taxa_por_pedido_aplicada, 0),
        0
      );

      -- Cartão na entrega: entregador precisa voltar à loja para devolver a
      -- maquininha, então recebe o frete dobrado.
      _eh_cartao := lower(coalesce(NEW.forma_pagamento::text, '')) IN ('cartao', 'cartao_credito', 'cartao_debito');
      IF _eh_cartao THEN
        _frete_entregador := _frete_entregador * 2;
      END IF;
    END IF;

    _taxa_entregador := _frete_entregador + COALESCE(NEW.bonus_entregador, 0);
    IF _taxa_entregador <= 0 THEN RETURN NEW; END IF;

    IF EXISTS (
      SELECT 1 FROM public.entregadores_saldo_saque_movimentos
      WHERE pedido_id = NEW.id AND tipo = 'credito_entrega'
    ) THEN
      RETURN NEW;
    END IF;

    PERFORM public.aplicar_movimento_entregador_saque(
      NEW.entregador_id, _taxa_entregador, 'credito_entrega', NEW.id, NULL,
      'Entrega pedido #' || NEW.numero
        || CASE WHEN NEW.agendamento_id IS NOT NULL THEN ' (turno agendado)'
                WHEN COALESCE(_eh_cartao, false) THEN ' (cartão: frete 2x)' ELSE '' END
    );

    PERFORM public.aplicar_movimento_loja_saldo(
      NEW.loja_id, -_taxa_entregador, 'debito_pedido', NEW.id,
      'Taxa de entrega pedido #' || NEW.numero
        || CASE WHEN NEW.agendamento_id IS NOT NULL THEN ' (turno agendado)'
                WHEN COALESCE(_eh_cartao, false) THEN ' (cartão: frete 2x p/ retorno da maquininha)' ELSE '' END
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- 5. Conclusão do turno paga as horas de cada entregador
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

  IF _valor_horas > 0 THEN
    FOR _ac IN
      SELECT entregador_id FROM public.agendamento_aceites
       WHERE agendamento_id = _agendamento_id
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM public.entregadores_saldo_saque_movimentos m
         WHERE m.entregador_id = _ac.entregador_id
           AND m.tipo = 'credito_turno_horas'
           AND m.descricao = 'Turno agendado ' || _agendamento_id::text
      ) THEN
        PERFORM public.aplicar_movimento_entregador_saque(
          _ac.entregador_id, _valor_horas, 'credito_turno_horas', NULL, NULL,
          'Turno agendado ' || _agendamento_id::text
        );
        PERFORM public.aplicar_movimento_loja_saldo(
          _a.loja_id, -_valor_horas, 'debito_turno_horas', NULL,
          'Horas de turno agendado ' || to_char(_a.data_turno, 'DD/MM/YYYY')
        );
      END IF;
    END LOOP;
  END IF;

  UPDATE public.agendamentos
     SET status = 'concluido', concluido_em = now()
   WHERE id = _agendamento_id;
END;
$function$;

-- 6. Ganhos do dia passam a incluir as horas de turno
CREATE OR REPLACE FUNCTION public.get_ganho_hoje(_entregador_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(SUM(m.valor), 0)::numeric
  FROM public.entregadores_saldo_saque_movimentos m
  WHERE m.entregador_id = _entregador_id
    AND m.tipo IN ('credito_entrega','credito_turno_horas')
    AND m.created_at
        >= (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo');
$function$;

-- 7. Meus turnos: mostrar entregas e ganhos acumulados no turno
DROP FUNCTION IF EXISTS public.listar_meus_turnos_entregador();
CREATE OR REPLACE FUNCTION public.listar_meus_turnos_entregador()
RETURNS TABLE(id uuid, loja_id uuid, data_turno date, hora_inicio time without time zone, duracao_horas numeric, valor_por_hora numeric, taxa_por_entrega numeric, observacoes text, status agendamento_status, vagas_total integer, vagas_preenchidas integer, aceito_em timestamp with time zone, loja_nome text, loja_endereco text, loja_endereco_lat numeric, loja_endereco_lng numeric, loja_telefone text, entregas_no_turno integer, ganho_entregas numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT a.id, a.loja_id, a.data_turno, a.hora_inicio, a.duracao_horas,
         a.valor_por_hora, a.taxa_por_entrega, a.observacoes, a.status,
         a.vagas_total, a.vagas_preenchidas, ac.aceito_em,
         l.nome, l.endereco, l.endereco_lat, l.endereco_lng, l.telefone,
         COALESCE(e.qtd, 0)::int,
         COALESCE(e.total, 0)::numeric
    FROM public.agendamento_aceites ac
    JOIN public.agendamentos a ON a.id = ac.agendamento_id
    LEFT JOIN public.lojas l ON l.id = a.loja_id
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS qtd,
             SUM(COALESCE(p.taxa_turno_entregador, 0) + COALESCE(p.bonus_entregador, 0)) AS total
        FROM public.pedidos p
       WHERE p.agendamento_id = a.id
         AND p.entregador_id = ac.entregador_id
         AND p.status = 'entregue'::pedido_status
    ) e ON true
   WHERE ac.entregador_id = auth.uid()
     AND a.status IN ('aceito','publicado','concluido')
   ORDER BY a.data_turno DESC, a.hora_inicio DESC;
$function$;