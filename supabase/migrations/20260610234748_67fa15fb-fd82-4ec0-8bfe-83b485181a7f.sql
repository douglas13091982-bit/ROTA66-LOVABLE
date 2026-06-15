CREATE OR REPLACE FUNCTION public.confirmar_coleta(_pedido_id uuid, _codigo text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _p public.pedidos%ROWTYPE;
BEGIN
  SELECT * INTO _p FROM public.pedidos WHERE id = _pedido_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
  IF NOT public.is_loja_owner(auth.uid(), _p.loja_id) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  IF _p.status <> 'em_rota' THEN
    RAISE EXCEPTION 'Pedido não está em rota de coleta';
  END IF;
  IF _p.codigo_coleta IS DISTINCT FROM _codigo THEN
    RAISE EXCEPTION 'Código inválido';
  END IF;

  PERFORM set_config('app.bypass_pedido_guard', 'on', true);

  -- Confirma em cascata todos os pedidos do mesmo grupo:
  --   - mesmo rota_id (quando existir), OU
  --   - mesma loja + mesmo entregador + mesmo codigo_coleta
  -- Restringe a pedidos ainda em rota para evitar reverter estado.
  UPDATE public.pedidos
    SET status = 'coletado',
        coleta_confirmada_em = now()
    WHERE status = 'em_rota'
      AND loja_id = _p.loja_id
      AND (
        (_p.rota_id IS NOT NULL AND rota_id = _p.rota_id)
        OR (
          _p.codigo_coleta IS NOT NULL
          AND codigo_coleta = _p.codigo_coleta
          AND entregador_id IS NOT NULL
          AND entregador_id = _p.entregador_id
        )
        OR id = _pedido_id
      );

  RETURN true;
END;
$function$;