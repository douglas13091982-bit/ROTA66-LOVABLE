ALTER TABLE public.loja_categorias
  ADD COLUMN IF NOT EXISTS icone_url text;

DROP POLICY IF EXISTS "categoria_icones_public_read" ON storage.objects;
CREATE POLICY "categoria_icones_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'categoria-icones');

DROP POLICY IF EXISTS "categoria_icones_super_insert" ON storage.objects;
CREATE POLICY "categoria_icones_super_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'categoria-icones' AND public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "categoria_icones_super_update" ON storage.objects;
CREATE POLICY "categoria_icones_super_update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'categoria-icones' AND public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "categoria_icones_super_delete" ON storage.objects;
CREATE POLICY "categoria_icones_super_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'categoria-icones' AND public.has_role(auth.uid(), 'super_admin'));
