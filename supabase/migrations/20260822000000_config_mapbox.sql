-- Adicionar campos de Mapbox na tabela config_frete
ALTER TABLE public.config_frete 
ADD COLUMN IF NOT EXISTS mapbox_access_token TEXT,
ADD COLUMN IF NOT EXISTS provedor_mapa TEXT DEFAULT 'google' CHECK (provedor_mapa IN ('google', 'mapbox'));

COMMENT ON COLUMN public.config_frete.provedor_mapa IS 'Define qual provedor de mapas o sistema deve utilizar (google ou mapbox)';

-- O RLS já deve estar habilitado na tabela, mas garantimos os grants
GRANT SELECT, UPDATE ON public.config_frete TO authenticated;
GRANT ALL ON public.config_frete TO service_role;
