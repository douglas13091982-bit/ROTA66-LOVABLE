
-- 1. Marcar lojas como "avulsa da plataforma"
ALTER TABLE public.lojas
  ADD COLUMN IF NOT EXISTS avulsa_plataforma boolean NOT NULL DEFAULT false;

-- 2. Marcar a loja "ROTA 66" existente como avulsa da plataforma
UPDATE public.lojas
   SET avulsa_plataforma = true,
       plano_mensal_ativo = true
 WHERE id = '3b05b069-ac20-4c10-87c9-2dde2977a9ae';

-- 3. Salvar o ID em private_config para uso pelas server functions
INSERT INTO public.private_config (key, value)
VALUES ('loja_avulsa_id', to_jsonb('3b05b069-ac20-4c10-87c9-2dde2977a9ae'::text))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
