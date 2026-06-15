CREATE POLICY "Avatars: leitura autenticada"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'avatars');