DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'entregador_saques'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.entregador_saques;
  END IF;
END $$;
ALTER TABLE public.entregador_saques REPLICA IDENTITY FULL;