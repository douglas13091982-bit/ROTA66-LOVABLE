ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS chegou_entrega_at timestamptz;

CREATE OR REPLACE FUNCTION public.entregador_chegou_entrega(_pedido_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_entregador uuid;
  v_status text;
  v_qtd integer := 0;
BEGIN
  SELECT entregador_id, status::text INTO v_entregador, v_status
    FROM public.pedidos WHERE id = _pedido_id;

  IF v_entregador IS NULL OR v_entregador <> auth.uid() THEN
    RAISE EXCEPTION 'Pedido não pertence a este entregador';
  END IF;

  IF v_status NOT IN ('em_rota','coletado') THEN
    RETURN 0;
  END IF;

  UPDATE public.pedidos
     SET chegou_entrega_at = COALESCE(chegou_entrega_at, now()),
         updated_at = now()
   WHERE id = _pedido_id
     AND entregador_id = v_entregador;
  GET DIAGNOSTICS v_qtd = ROW_COUNT;
  RETURN v_qtd;
END;
$function$;

DROP FUNCTION IF EXISTS public.rastrear_pedido(uuid);

CREATE FUNCTION public.rastrear_pedido(_pedido_id uuid)
RETURNS TABLE(id uuid, numero integer, status pedido_status, cliente_nome text, endereco_entrega text, complemento text, loja_nome text, codigo_entrega text, coleta_confirmada_em timestamp with time zone, entrega_confirmada_em timestamp with time zone, chegou_entrega_at timestamp with time zone, created_at timestamp with time zone)
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
    p.chegou_entrega_at,
    p.created_at
  FROM public.pedidos p
  LEFT JOIN public.lojas l ON l.id = p.loja_id
  WHERE p.id = _pedido_id;
$function$;