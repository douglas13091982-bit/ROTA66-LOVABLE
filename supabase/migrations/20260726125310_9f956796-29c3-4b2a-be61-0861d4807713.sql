
-- Atribui um pedido pronto/sem entregador a um entregador livre do turno ativo.
CREATE OR REPLACE FUNCTION public.redespachar_pedido_turno(_pedido_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _p record;
  _turno record;
  _ent uuid;
  _saldo numeric;
BEGIN
  SELECT * INTO _p FROM public.pedidos WHERE id = _pedido_id FOR UPDATE;
  IF _p.id IS NULL OR _p.status <> 'pronto'::pedido_status OR _p.entregador_id IS NOT NULL THEN
    RETURN false;
  END IF;

  SELECT a.id, a.taxa_por_entrega
    INTO _turno
    FROM public.agendamentos a
   WHERE a.loja_id = _p.loja_id
     AND a.status IN ('publicado','aceito')
     AND ((a.data_turno + a.hora_inicio) AT TIME ZONE 'America/Sao_Paulo') <= now()
     AND ((a.data_turno + a.hora_inicio) AT TIME ZONE 'America/Sao_Paulo')
         + make_interval(mins => (COALESCE(a.duracao_horas, 0) * 60)::int) > now()
   ORDER BY a.data_turno DESC, a.hora_inicio DESC
   LIMIT 1;

  IF _turno.id IS NULL THEN
    RETURN false;
  END IF;

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
    RETURN false;
  END IF;

  SELECT COALESCE(saldo, 0) INTO _saldo FROM public.lojas_saldo WHERE loja_id = _p.loja_id;
  IF COALESCE(_saldo, 0) < COALESCE(_turno.taxa_por_entrega, 0) THEN
    RETURN false;
  END IF;

  PERFORM set_config('app.bypass_pedido_guard', 'on', true);

  UPDATE public.pedidos
     SET agendamento_id = _turno.id,
         taxa_turno_entregador = COALESCE(_turno.taxa_por_entrega, 0),
         entregador_id = _ent,
         status = 'em_rota'::pedido_status
   WHERE id = _pedido_id;

  PERFORM set_config('app.bypass_pedido_guard', 'off', true);

  RETURN true;
END;
$function$;

-- Reavalia todos os pedidos prontos sem entregador de uma loja.
CREATE OR REPLACE FUNCTION public.redespachar_pedidos_loja(_loja_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _r record;
  _n integer := 0;
BEGIN
  FOR _r IN
    SELECT p.id
      FROM public.pedidos p
     WHERE p.loja_id = _loja_id
       AND p.status = 'pronto'::pedido_status
       AND p.entregador_id IS NULL
       AND COALESCE(p.arquivado, false) = false
     ORDER BY p.created_at ASC
  LOOP
    IF public.redespachar_pedido_turno(_r.id) THEN
      _n := _n + 1;
    END IF;
  END LOOP;

  -- Sobrou pedido órfão? reabre ofertas para entregadores externos
  IF EXISTS (
    SELECT 1 FROM public.pedidos p
     WHERE p.loja_id = _loja_id
       AND p.status = 'pronto'::pedido_status
       AND p.entregador_id IS NULL
       AND COALESCE(p.arquivado, false) = false
  ) THEN
    PERFORM public.processar_ofertas_externas();
  END IF;

  RETURN _n;
END;
$function$;

-- Dispara o re-despacho quando um entregador libera (entrega/cancela) um pedido.
CREATE OR REPLACE FUNCTION public.tg_pedidos_redespacho()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status IN ('em_rota'::pedido_status, 'coletado'::pedido_status)
     AND (
       NEW.status IN ('entregue'::pedido_status, 'cancelado'::pedido_status)
       OR (NEW.entregador_id IS NULL AND OLD.entregador_id IS NOT NULL)
     )
  THEN
    PERFORM public.redespachar_pedidos_loja(NEW.loja_id);
  END IF;
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS trg_pedidos_redespacho ON public.pedidos;
CREATE TRIGGER trg_pedidos_redespacho
AFTER UPDATE OF status, entregador_id ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION public.tg_pedidos_redespacho();
