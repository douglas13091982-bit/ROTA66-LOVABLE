DROP FUNCTION IF EXISTS public.rastrear_pedido(uuid);

CREATE OR REPLACE FUNCTION public.rastrear_pedido(p_pedido_id uuid)
RETURNS TABLE (
  id uuid,
  numero integer,
  status public.pedido_status,
  cliente_nome text,
  endereco_entrega text,
  complemento text,
  loja_nome text,
  loja_lat double precision,
  loja_lng double precision,
  entrega_lat double precision,
  entrega_lng double precision,
  entregador_id uuid,
  entregador_nome text,
  entregador_foto text,
  codigo_entrega text,
  criado_at timestamptz,
  chegou_entrega_at timestamptz,
  entrega_confirmada_em timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.numero,
    p.status,
    p.cliente_nome,
    p.endereco_entrega,
    p.complemento,
    l.nome as loja_nome,
    p.endereco_coleta_lat as loja_lat,
    p.endereco_coleta_lng as loja_lng,
    p.endereco_entrega_lat as entrega_lat,
    p.endereco_entrega_lng as entrega_lng,
    p.entregador_id,
    e.nome as entregador_nome,
    e.foto_url as entregador_foto,
    p.codigo_entrega,
    p.created_at as criado_at,
    p.chegou_entrega_at,
    p.entrega_confirmada_em
  FROM public.pedidos p
  JOIN public.lojas l ON l.id = p.loja_id
  LEFT JOIN public.entregadores e ON e.id = p.entregador_id
  WHERE p.id = p_pedido_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rastrear_pedido(uuid) TO anon, authenticated, service_role;
