-- 1. Troca o default da coluna status de 'pendente' para 'aprovado'
ALTER TABLE public.lojas
  ALTER COLUMN status SET DEFAULT 'aprovado'::status_moderacao;

-- 2. Backfill: libera todas as lojas que ainda estavam pendentes
UPDATE public.lojas
SET status = 'aprovado'::status_moderacao,
    ativa = true
WHERE status = 'pendente'::status_moderacao;