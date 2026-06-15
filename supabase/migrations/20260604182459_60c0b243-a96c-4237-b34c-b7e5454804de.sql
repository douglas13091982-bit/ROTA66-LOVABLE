DROP TRIGGER IF EXISTS trg_auto_atribuir_pedido ON public.pedidos;
DROP TRIGGER IF EXISTS trg_auto_atribuir ON public.pedidos;
DROP FUNCTION IF EXISTS public.trg_auto_atribuir() CASCADE;
DROP FUNCTION IF EXISTS public.auto_atribuir_pedido(uuid) CASCADE;

ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS duracao_estimada_seg integer,
  ADD COLUMN IF NOT EXISTS distancia_metros integer,
  ADD COLUMN IF NOT EXISTS eta_chegada_at timestamptz;