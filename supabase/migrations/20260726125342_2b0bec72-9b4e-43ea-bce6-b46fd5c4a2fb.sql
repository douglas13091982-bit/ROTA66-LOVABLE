
REVOKE ALL ON FUNCTION public.redespachar_pedido_turno(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.redespachar_pedidos_loja(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redespachar_pedidos_loja(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.redespachar_pedido_turno(uuid) TO service_role;
