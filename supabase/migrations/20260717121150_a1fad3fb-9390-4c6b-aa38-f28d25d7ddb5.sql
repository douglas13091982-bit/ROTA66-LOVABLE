
CREATE OR REPLACE FUNCTION public.entregador_chegou_coleta(_pedido_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entregador uuid;
  v_rota uuid;
  v_status text;
  v_qtd integer := 0;
BEGIN
  SELECT entregador_id, rota_id, status
    INTO v_entregador, v_rota, v_status
    FROM public.pedidos
    WHERE id = _pedido_id;

  IF v_entregador IS NULL OR v_entregador <> auth.uid() THEN
    RAISE EXCEPTION 'Pedido não pertence a este entregador';
  END IF;

  IF v_status <> 'em_rota' THEN
    RETURN 0;
  END IF;

  IF v_rota IS NOT NULL THEN
    UPDATE public.pedidos
       SET deadline_coleta_at = NULL,
           updated_at = now()
     WHERE rota_id = v_rota
       AND entregador_id = v_entregador
       AND status = 'em_rota'
       AND deadline_coleta_at IS NOT NULL;
    GET DIAGNOSTICS v_qtd = ROW_COUNT;
  ELSE
    UPDATE public.pedidos
       SET deadline_coleta_at = NULL,
           updated_at = now()
     WHERE id = _pedido_id
       AND entregador_id = v_entregador
       AND status = 'em_rota'
       AND deadline_coleta_at IS NOT NULL;
    GET DIAGNOSTICS v_qtd = ROW_COUNT;
  END IF;

  RETURN v_qtd;
END;
$$;

REVOKE ALL ON FUNCTION public.entregador_chegou_coleta(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.entregador_chegou_coleta(uuid) TO authenticated, service_role;
