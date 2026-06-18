ALTER TABLE public.lojas
  ADD COLUMN IF NOT EXISTS fechado_manualmente boolean NOT NULL DEFAULT false;

-- Reagenda o cron respeitando o fechamento manual
DO $$
BEGIN
  PERFORM cron.unschedule('lojas-auto-abrir-fechar');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'lojas-auto-abrir-fechar',
  '*/5 * * * *',
  $$
  UPDATE public.lojas
     SET ativa = public.loja_aberta_agora(horario_funcionamento, usar_horario_automatico, ativa)
   WHERE usar_horario_automatico = true
     AND fechado_manualmente = false
     AND ativa IS DISTINCT FROM public.loja_aberta_agora(horario_funcionamento, usar_horario_automatico, ativa);
  $$
);