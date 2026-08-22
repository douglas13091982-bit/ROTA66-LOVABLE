-- Adiciona políticas para super_admin gerenciar a tabela config_frete
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'config_frete' AND policyname = 'Super admins can manage config_frete') THEN
        CREATE POLICY "Super admins can manage config_frete" 
        ON public.config_frete 
        FOR ALL 
        TO authenticated 
        USING (public.has_role(auth.uid(), 'super_admin'))
        WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'config_frete' AND policyname = 'Admins can manage config_frete_fixed') THEN
        CREATE POLICY "Admins can manage config_frete_fixed" 
        ON public.config_frete 
        FOR ALL 
        TO authenticated 
        USING (public.has_role(auth.uid(), 'admin'))
        WITH CHECK (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;

-- Garante que o registro singleton exista com valores padrão se estiver vazio
INSERT INTO public.config_frete (id, provedor_mapa)
VALUES ('singleton', 'google')
ON CONFLICT (id) DO NOTHING;

-- Garante as permissões de acesso via API
GRANT SELECT, INSERT, UPDATE, DELETE ON public.config_frete TO authenticated;
GRANT ALL ON public.config_frete TO service_role;
