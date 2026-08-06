DROP FUNCTION IF EXISTS public.rastrear_pedido(uuid);

CREATE FUNCTION public.rastrear_pedido(_pedido_id uuid)
RETURNS TABLE(
  id uuid, 
  numero integer, 
  status pedido_status, 
  cliente_nome text, 
  endereco_entrega text, 
  complemento text, 
  loja_nome text, 
  codigo_entrega text, 
  coleta_confirmada_em timestamp with time zone, 
  entrega_confirmada_em timestamp with time zone, 
  chegou_entrega_at timestamp with time zone, 
  created_at timestamp with time zone,
  entregador_nome text,
  entregador_foto text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    p.created_at,
    pr.full_name AS entregador_nome,
    pr.avatar_url AS entregador_foto
  FROM public.pedidos p
  LEFT JOIN public.lojas l ON l.id = p.loja_id
  LEFT JOIN public.profiles pr ON pr.id = p.entregador_id
  WHERE p.id = _pedido_id;
$$;

GRANT EXECUTE ON FUNCTION public.rastrear_pedido(uuid) TO anon, authenticated;