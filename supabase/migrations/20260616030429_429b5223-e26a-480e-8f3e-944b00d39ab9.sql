
ALTER TABLE public.pedidos REPLICA IDENTITY FULL;
ALTER TABLE public.pedido_mensagens REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pedido_mensagens;
