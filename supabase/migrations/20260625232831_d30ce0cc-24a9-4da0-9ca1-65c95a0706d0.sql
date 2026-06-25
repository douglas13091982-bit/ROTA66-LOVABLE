
-- 1) Fix: view pública deve respeitar permissões do invocador
ALTER VIEW public.lojas_publicas SET (security_invoker = true);

-- 2) Remover policies amplas de SELECT em lojas para entregadores
DROP POLICY IF EXISTS "Entregador vê lojas vinculadas" ON public.lojas;
DROP POLICY IF EXISTS "Entregador ve loja dos seus pedidos" ON public.lojas;

-- 3) Criar view restrita p/ entregadores (apenas colunas não-sensíveis)
CREATE OR REPLACE VIEW public.lojas_para_entregador
WITH (security_invoker = true) AS
SELECT
  l.id,
  l.nome,
  l.slug,
  l.endereco,
  l.endereco_lat,
  l.endereco_lng,
  l.cidade,
  l.estado,
  l.logo_url,
  l.horario_funcionamento,
  l.categoria,
  l.status
FROM public.lojas l
WHERE
  EXISTS (
    SELECT 1 FROM public.loja_entregadores le
    WHERE le.loja_id = l.id AND le.entregador_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.loja_id = l.id AND p.entregador_id = auth.uid()
  );

GRANT SELECT ON public.lojas_para_entregador TO authenticated;
