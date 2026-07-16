CREATE OR REPLACE FUNCTION public.confirmar_coleta(_pedido_id uuid, _codigo text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _p public.pedidos%ROWTYPE;
  _count integer;
BEGIN
  SELECT * INTO _p FROM public.pedidos WHERE id = _pedido_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
  IF NOT (
    public.is_loja_owner(auth.uid(), _p.loja_id)
    OR public.is_loja_funcionario(auth.uid(), _p.loja_id)
  ) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  IF _p.status <> 'em_rota' THEN
    RAISE EXCEPTION 'Pedido não está em rota de coleta';
  END IF;
  IF _p.codigo_coleta IS DISTINCT FROM _codigo THEN
    RAISE EXCEPTION 'Código inválido';
  END IF;

  PERFORM set_config('app.bypass_pedido_guard', 'on', true);

  -- Quando o pedido faz parte de uma rota agrupada (mesmo rota_id + mesmo
  -- codigo_coleta + mesmo entregador), confirmar UM código libera TODOS os
  -- pedidos da mesma coleta. Sem isso, a rota "desagrupa" visualmente no
  -- app do entregador (só o pedido confirmado avança para "coletado" e os
  -- demais continuam em "em_rota", quebrando o card consolidado).
  IF _p.rota_id IS NOT NULL THEN
    UPDATE public.pedidos
      SET status = 'coletado', coleta_confirmada_em = now()
      WHERE rota_id = _p.rota_id
        AND loja_id = _p.loja_id
        AND entregador_id IS NOT DISTINCT FROM _p.entregador_id
        AND codigo_coleta = _codigo
        AND status = 'em_rota';
    GET DIAGNOSTICS _count = ROW_COUNT;
  ELSE
    UPDATE public.pedidos
      SET status = 'coletado', coleta_confirmada_em = now()
      WHERE id = _pedido_id;
  END IF;

  RETURN true;
END;
$function$;