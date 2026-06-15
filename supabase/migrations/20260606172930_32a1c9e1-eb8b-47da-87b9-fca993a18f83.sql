
-- RLS policies for avatars bucket: each user owns folder named with their UID

CREATE POLICY "Avatars: leitura autenticada" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "Avatars: usuário gerencia seus arquivos" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
