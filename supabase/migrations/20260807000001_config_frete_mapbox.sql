DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'config_frete' AND column_name = 'provedor_mapa') THEN
        ALTER TABLE public.config_frete ADD COLUMN provedor_mapa text DEFAULT 'google';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'config_frete' AND column_name = 'mapbox_access_token') THEN
        ALTER TABLE public.config_frete ADD COLUMN mapbox_access_token text;
    END IF;
END $$;
