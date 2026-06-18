CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove agendamento antigo se existir
DO $$
BEGIN
  PERFORM cron.unschedule('lojas-auto-abrir-fechar');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Roda a cada 5 minutos: atualiza lojas.ativa conforme horario_funcionamento
-- para lojas em modo automatico. Usa a função existente loja_aberta_agora.
SELECT cron.schedule(
  'lojas-auto-abrir-fechar',
  '*/5 * * * *',
  $$
  UPDATE public.lojas
     SET ativa = public.loja_aberta_agora(horario_funcionamento, usar_horario_automatico, ativa)
   WHERE usar_horario_automatico = true
     AND ativa IS DISTINCT FROM public.loja_aberta_agora(horario_funcionamento, usar_horario_automatico, ativa);
  $$
);

-- Aplica imediatamente para já refletir agora
UPDATE public.lojas
   SET ativa = public.loja_aberta_agora(horario_funcionamento, usar_horario_automatico, ativa)
 WHERE usar_horario_automatico = true
   AND ativa IS DISTINCT FROM public.loja_aberta_agora(horario_funcionamento, usar_horario_automatico, ativa);