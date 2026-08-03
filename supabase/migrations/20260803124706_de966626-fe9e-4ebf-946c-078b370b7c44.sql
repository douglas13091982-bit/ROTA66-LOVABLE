INSERT INTO public.config_notificacao_som (scope, ativo, volume, vibrar)
VALUES ('push_entregador', true, 0.7, true)
ON CONFLICT (scope) DO NOTHING;