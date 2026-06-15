
-- 1) Recria a view pública sem o campo de billing
DROP VIEW IF EXISTS public.lojas_publicas;
CREATE VIEW public.lojas_publicas
WITH (security_invoker = true) AS
SELECT id, nome, slug, telefone, endereco, endereco_lat, endereco_lng,
       cidade, estado, logo_url, taxa_entrega_base, horario_funcionamento,
       catalogo_ativo, catalogo_slug, catalogo_layout,
       public.loja_aberta_agora(horario_funcionamento, usar_horario_automatico, ativa) AS ativa,
       usar_horario_automatico, status, categoria
  FROM public.lojas
 WHERE ((usar_horario_automatico = false AND ativa = true) OR usar_horario_automatico = true)
   AND status = 'aprovado'::public.status_moderacao;

GRANT SELECT ON public.lojas_publicas TO anon, authenticated;

-- 2) Restringe tarifas_loja: só lojas com catálogo público
DROP POLICY IF EXISTS "Tarifas loja ativas são visíveis" ON public.tarifas_loja;
CREATE POLICY "Tarifas de lojas publicas sao visiveis"
ON public.tarifas_loja
FOR SELECT
TO anon, authenticated
USING (
  ativa = true
  AND EXISTS (
    SELECT 1 FROM public.lojas l
     WHERE l.id = tarifas_loja.loja_id
       AND l.catalogo_ativo = true
       AND l.status = 'aprovado'::public.status_moderacao
  )
);
