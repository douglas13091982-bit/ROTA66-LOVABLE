ALTER TABLE public.config_notificacao_som
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'entregador';

UPDATE public.config_notificacao_som SET scope='entregador' WHERE scope IS NULL OR scope='global';

CREATE UNIQUE INDEX IF NOT EXISTS config_notificacao_som_scope_uidx ON public.config_notificacao_som(scope);

INSERT INTO public.config_notificacao_som (scope, ativo, volume, vibrar)
SELECT 'loja', true, 1.0, true
WHERE NOT EXISTS (SELECT 1 FROM public.config_notificacao_som WHERE scope='loja');