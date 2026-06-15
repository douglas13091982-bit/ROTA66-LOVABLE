ALTER TABLE public.cobrancas_loja REPLICA IDENTITY FULL;
ALTER TABLE public.mensalidades_loja REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cobrancas_loja;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mensalidades_loja;