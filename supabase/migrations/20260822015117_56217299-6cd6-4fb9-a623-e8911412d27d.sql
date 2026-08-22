
-- 1. Tentar converter usando um cast explícito e renomear
ALTER TABLE public.config_frete RENAME COLUMN id TO old_id;
ALTER TABLE public.config_frete ADD COLUMN id text;
UPDATE public.config_frete SET id = old_id::text;
ALTER TABLE public.config_frete DROP COLUMN old_id;
ALTER TABLE public.config_frete ADD PRIMARY KEY (id);

-- 2. Inserir o registro
INSERT INTO public.config_frete (id, provedor_mapa)
VALUES ('singleton', 'google')
ON CONFLICT (id) DO UPDATE SET provedor_mapa = EXCLUDED.provedor_mapa;

-- 3. Garantir permissões
GRANT SELECT, INSERT, UPDATE, DELETE ON public.config_frete TO authenticated;
GRANT ALL ON public.config_frete TO service_role;
