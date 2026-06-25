ALTER TABLE public.lojas_saldo REPLICA IDENTITY FULL;
ALTER TABLE public.entregadores_saldo_saque REPLICA IDENTITY FULL;
ALTER TABLE public.lojas_saldo_movimentos REPLICA IDENTITY FULL;
ALTER TABLE public.entregadores_saldo_saque_movimentos REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.lojas_saldo;
ALTER PUBLICATION supabase_realtime ADD TABLE public.entregadores_saldo_saque;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lojas_saldo_movimentos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.entregadores_saldo_saque_movimentos;