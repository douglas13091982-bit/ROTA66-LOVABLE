CREATE OR REPLACE FUNCTION public.loja_tem_catalogo_publico(_loja_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.lojas
    WHERE id = _loja_id
      AND ativa = true
      AND status = 'aprovado'::status_moderacao
      AND catalogo_ativo = true
  );
$$;

REVOKE ALL ON FUNCTION public.loja_tem_catalogo_publico(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.loja_tem_catalogo_publico(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "Publico ve produtos de loja com catalogo ativo" ON public.produtos;

CREATE POLICY "Publico ve produtos de loja com catalogo ativo"
ON public.produtos
FOR SELECT
TO anon, authenticated
USING (ativo = true AND public.loja_tem_catalogo_publico(loja_id));