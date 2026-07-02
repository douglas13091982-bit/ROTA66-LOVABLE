ALTER TABLE public.entregador_creditos REPLICA IDENTITY FULL;
ALTER TABLE public.entregador_creditos_transacoes REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.entregador_creditos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.entregador_creditos_transacoes;