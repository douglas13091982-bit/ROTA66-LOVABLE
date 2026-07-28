ALTER TABLE public.agendamentos REPLICA IDENTITY FULL;
ALTER TABLE public.agendamento_ofertas REPLICA IDENTITY FULL;
ALTER TABLE public.agendamento_aceites REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agendamentos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agendamento_ofertas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agendamento_aceites;