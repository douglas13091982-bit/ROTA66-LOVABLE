
CREATE OR REPLACE FUNCTION public.confirmar_coleta(_pedido_id uuid, _codigo text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _p public.pedidos%ROWTYPE;
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
  UPDATE public.pedidos
    SET status = 'coletado', coleta_confirmada_em = now()
    WHERE id = _pedido_id;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirmar_entrega(_pedido_id uuid, _codigo text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _p public.pedidos%ROWTYPE;
BEGIN
  SELECT * INTO _p FROM public.pedidos WHERE id = _pedido_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
  IF NOT (
    public.is_loja_owner(auth.uid(), _p.loja_id)
    OR public.is_loja_funcionario(auth.uid(), _p.loja_id)
    OR (_p.cliente_user_id IS NOT NULL AND auth.uid() = _p.cliente_user_id)
    OR (_p.entregador_id IS NOT NULL AND auth.uid() = _p.entregador_id)
  ) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  IF _p.status <> 'coletado' THEN
    RAISE EXCEPTION 'Pedido ainda não foi coletado';
  END IF;
  IF _p.codigo_entrega IS DISTINCT FROM _codigo THEN
    RAISE EXCEPTION 'Código inválido';
  END IF;
  PERFORM set_config('app.bypass_pedido_guard', 'on', true);
  UPDATE public.pedidos
    SET status = 'entregue', entrega_confirmada_em = now()
    WHERE id = _pedido_id;
  RETURN true;
END;
$$;
