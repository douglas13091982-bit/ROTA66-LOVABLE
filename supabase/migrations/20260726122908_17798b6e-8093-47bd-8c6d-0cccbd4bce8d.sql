CREATE OR REPLACE FUNCTION public.entregador_confirmar_coleta(_pedido_id uuid)
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
  IF _p.entregador_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  IF _p.status <> 'em_rota' THEN
    RAISE EXCEPTION 'Pedido não está em rota de coleta';
  END IF;

  PERFORM set_config('app.bypass_pedido_guard', 'on', true);

  IF _p.rota_id IS NOT NULL THEN
    UPDATE public.pedidos
      SET status = 'coletado', coleta_confirmada_em = now()
      WHERE rota_id = _p.rota_id
        AND loja_id = _p.loja_id
        AND entregador_id = auth.uid()
        AND status = 'em_rota';
  ELSE
    UPDATE public.pedidos
      SET status = 'coletado', coleta_confirmada_em = now()
      WHERE id = _pedido_id;
  END IF;

  RETURN true;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.entregador_confirmar_coleta(uuid) TO authenticated;