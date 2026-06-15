
CREATE OR REPLACE FUNCTION public.confirmar_entrega(_pedido_id uuid, _codigo text)
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
  IF NOT (
    public.is_loja_owner(auth.uid(), _p.loja_id)
    OR (_p.entregador_id IS NOT NULL AND auth.uid() = _p.entregador_id)
    OR (_p.cliente_user_id IS NOT NULL AND auth.uid() = _p.cliente_user_id)
  ) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  IF _p.status <> 'coletado' THEN
    RAISE EXCEPTION 'Pedido ainda não foi coletado';
  END IF;
  IF _p.codigo_entrega IS DISTINCT FROM _codigo THEN
    RAISE EXCEPTION 'Código inválido';
  END IF;
  UPDATE public.pedidos
    SET status = 'entregue', entrega_confirmada_em = now()
    WHERE id = _pedido_id;
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.rastrear_pedido(_pedido_id uuid)
 RETURNS TABLE(
   id uuid,
   numero integer,
   status pedido_status,
   cliente_nome text,
   endereco_entrega text,
   complemento text,
   loja_nome text,
   codigo_entrega text,
   coleta_confirmada_em timestamptz,
   entrega_confirmada_em timestamptz,
   created_at timestamptz
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    p.id,
    p.numero,
    p.status,
    p.cliente_nome,
    p.endereco_entrega,
    p.complemento,
    l.nome AS loja_nome,
    CASE WHEN p.status = 'coletado' THEN p.codigo_entrega ELSE NULL END AS codigo_entrega,
    p.coleta_confirmada_em,
    p.entrega_confirmada_em,
    p.created_at
  FROM public.pedidos p
  LEFT JOIN public.lojas l ON l.id = p.loja_id
  WHERE p.id = _pedido_id;
$function$;

GRANT EXECUTE ON FUNCTION public.rastrear_pedido(uuid) TO anon, authenticated;
