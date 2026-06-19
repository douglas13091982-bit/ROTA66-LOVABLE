ALTER TABLE public.config_notificacao_som DROP CONSTRAINT IF EXISTS config_notificacao_som_singleton_key;
CREATE UNIQUE INDEX IF NOT EXISTS config_notificacao_som_scope_key ON public.config_notificacao_som(scope);
INSERT INTO public.config_notificacao_som (scope, ativo, volume, vibrar) VALUES ('entregador', true, 0.8, true) ON CONFLICT (scope) DO UPDATE SET ativo = EXCLUDED.ativo;