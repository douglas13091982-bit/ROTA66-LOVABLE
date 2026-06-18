CREATE POLICY "Publico ve lojas com catalogo ativo"
ON public.lojas
FOR SELECT
TO anon, authenticated
USING (ativa = true AND status = 'aprovado'::status_moderacao AND catalogo_ativo = true);