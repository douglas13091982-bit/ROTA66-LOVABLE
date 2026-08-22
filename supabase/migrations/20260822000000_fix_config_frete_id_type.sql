-- Primeiro, vamos garantir que a tabela existe com o esquema correto.
-- Se o erro é "invalid input syntax for type integer: 'singleton'", a coluna 'id' é do tipo integer.
-- Vamos converter para text para suportar o identificador 'singleton' usado no código.

DO $$ 
BEGIN
    -- Se a coluna for integer, vamos convertê-la.
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'config_frete' 
        AND column_name = 'id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE public.config_frete ALTER COLUMN id TYPE text;
    END IF;
END $$;

-- Garantir que a linha 'singleton' exista
INSERT INTO public.config_frete (id, provedor_mapa)
VALUES ('singleton', 'google')
ON CONFLICT (id) DO NOTHING;

-- Garantir as permissões necessárias
GRANT SELECT, INSERT, UPDATE, DELETE ON public.config_frete TO authenticated;
GRANT ALL ON public.config_frete TO service_role;
