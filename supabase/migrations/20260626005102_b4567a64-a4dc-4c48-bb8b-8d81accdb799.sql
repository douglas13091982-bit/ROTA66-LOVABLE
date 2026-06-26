
DROP VIEW IF EXISTS public.lojas_publicas;

CREATE VIEW public.lojas_publicas
WITH (security_invoker = false) AS
SELECT
  id,
  nome,
  slug,
  telefone,
  endereco,
  endereco_lat,
  endereco_lng,
  cidade,
  estado,
  logo_url,
  taxa_entrega_base,
  horario_funcionamento,
  catalogo_ativo,
  catalogo_slug,
  catalogo_layout,
  CASE
    WHEN (fechado_manualmente = true) THEN false
    ELSE loja_aberta_agora(horario_funcionamento, usar_horario_automatico, ativa)
  END AS ativa,
  usar_horario_automatico,
  status,
  categoria
FROM public.lojas
WHERE (
  (
    (usar_horario_automatico = false AND ativa = true)
    OR (usar_horario_automatico = true AND fechado_manualmente = false)
    OR (usar_horario_automatico = true AND fechado_manualmente = true)
  )
  AND status = 'aprovado'::status_moderacao
);

REVOKE ALL ON public.lojas_publicas FROM PUBLIC;
GRANT SELECT ON public.lojas_publicas TO anon, authenticated, service_role;
