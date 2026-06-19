-- Remove broad anon/authenticated SELECT on public.lojas that exposed CNPJ,
-- mensalidade_valor, taxa_por_pedido, plano_id, owner_id, etc. Public catalog
-- pages already query the safe `lojas_publicas` view.
DROP POLICY IF EXISTS "Publico ve lojas com catalogo ativo" ON public.lojas;