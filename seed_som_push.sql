-- Adiciona a nova aba de som de push no admin
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.config_notificacao_som WHERE scope = 'push_entregador') THEN
    INSERT INTO public.config_notificacao_som (scope, ativo, volume, vibrar)
    VALUES ('push_entregador', true, 0.7, true);
  END IF;
END $$;
