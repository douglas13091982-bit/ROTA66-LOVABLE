GRANT EXECUTE ON FUNCTION public.pode_acessar_chat_pedido(uuid, uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';