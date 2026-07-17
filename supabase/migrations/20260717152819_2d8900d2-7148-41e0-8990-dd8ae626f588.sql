
DROP VIEW IF EXISTS public.lojas_para_entregador;
DROP VIEW IF EXISTS public.lojas_publicas;

ALTER TABLE public.lojas ALTER COLUMN categoria TYPE text USING categoria::text;

CREATE VIEW public.lojas_para_entregador AS
SELECT id, nome, slug, endereco, endereco_lat, endereco_lng, cidade, estado,
       logo_url, horario_funcionamento, categoria, status
  FROM public.lojas l
 WHERE EXISTS (SELECT 1 FROM public.loja_entregadores le
                WHERE le.loja_id = l.id AND le.entregador_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.pedidos p
                WHERE p.loja_id = l.id AND p.entregador_id = auth.uid());

CREATE VIEW public.lojas_publicas AS
SELECT id, nome, slug, telefone, endereco, endereco_lat, endereco_lng, cidade, estado,
       logo_url, taxa_entrega_base, horario_funcionamento, catalogo_ativo, catalogo_slug,
       catalogo_layout,
       CASE WHEN fechado_manualmente = true THEN false
            ELSE loja_aberta_agora(horario_funcionamento, usar_horario_automatico, ativa)
       END AS ativa,
       usar_horario_automatico, status, categoria, taxa_por_pedido, plano_mensal_ativo
  FROM public.lojas
 WHERE (usar_horario_automatico = false AND ativa = true
        OR usar_horario_automatico = true AND fechado_manualmente = false
        OR usar_horario_automatico = true AND fechado_manualmente = true)
   AND status = 'aprovado'::status_moderacao;

GRANT SELECT ON public.lojas_para_entregador TO authenticated;
GRANT SELECT ON public.lojas_publicas TO anon, authenticated;
