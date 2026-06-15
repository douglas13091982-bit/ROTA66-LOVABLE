
-- Storage policies para bucket produtos
-- Convenção de path: {loja_id}/{filename}

CREATE POLICY "Imagens de produto publicas para leitura"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'produtos');

CREATE POLICY "Dono envia imagens de seus produtos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'produtos'
    AND public.is_loja_owner(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "Dono atualiza imagens de seus produtos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'produtos'
    AND public.is_loja_owner(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "Dono remove imagens de seus produtos"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'produtos'
    AND public.is_loja_owner(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );
