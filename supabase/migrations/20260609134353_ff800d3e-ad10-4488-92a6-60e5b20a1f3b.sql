
-- 1) Restringir leitura pública de colunas sensíveis em public.lojas
-- Substitui a política aberta por uma view só com colunas seguras.

DROP POLICY IF EXISTS "Lojas aprovadas: leitura publica de colunas seguras" ON public.lojas;

CREATE OR REPLACE VIEW public.lojas_publicas
WITH (security_invoker = false) AS
SELECT
  id, nome, slug, telefone, endereco, endereco_lat, endereco_lng,
  cidade, estado, logo_url, taxa_entrega_base, horario_funcionamento,
  catalogo_ativo, catalogo_slug, catalogo_layout,
  ativa, status, plano_mensal_ativo
FROM public.lojas
WHERE ativa = true AND status = 'aprovado'::public.status_moderacao;

REVOKE ALL ON public.lojas_publicas FROM PUBLIC;
GRANT SELECT ON public.lojas_publicas TO anon, authenticated;

-- 2) Lock down Realtime broadcast/presence: explicit deny for anon/authenticated.
-- Postgres changes seguem checando RLS nas tabelas de origem; aqui só
-- documentamos e bloqueamos broadcast/presence (o app não usa).
DO $$
BEGIN
  ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN insufficient_privilege THEN
  -- já gerenciado pela Supabase
  NULL;
END $$;

DO $$
BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "deny_broadcast_presence_anon_auth" ON realtime.messages';
  EXECUTE $p$CREATE POLICY "deny_broadcast_presence_anon_auth" ON realtime.messages
    FOR ALL TO anon, authenticated
    USING (false) WITH CHECK (false)$p$;
EXCEPTION WHEN insufficient_privilege THEN
  NULL;
END $$;
