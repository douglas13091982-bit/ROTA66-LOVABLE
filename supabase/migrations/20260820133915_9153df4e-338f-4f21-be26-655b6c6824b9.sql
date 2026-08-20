CREATE TABLE IF NOT EXISTS public.config_frete (
    id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    google_maps_key text,
    origem_endereco text,
    origem_numero text,
    origem_bairro text,
    origem_cidade text,
    origem_uf text,
    origem_cep text,
    origem_lat double precision,
    origem_lng double precision,
    modo_calculo text DEFAULT 'fixo_km' CHECK (modo_calculo IN ('fixo_km', 'faixas')),
    valor_base numeric DEFAULT 0,
    valor_por_km numeric DEFAULT 0,
    faixas_distancia jsonb DEFAULT '[]'::jsonb,
    distancia_maxima numeric DEFAULT 50,
    frete_gratis_ativo boolean DEFAULT false,
    frete_gratis_minimo numeric DEFAULT 0,
    status_operacional boolean DEFAULT false,
    updated_at timestamp with time zone DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.config_frete TO authenticated;
GRANT ALL ON public.config_frete TO service_role;

ALTER TABLE public.config_frete ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage config_frete') THEN
        CREATE POLICY "Admins can manage config_frete" ON public.config_frete FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;

INSERT INTO public.config_frete (id) VALUES (1) ON CONFLICT (id) DO NOTHING;