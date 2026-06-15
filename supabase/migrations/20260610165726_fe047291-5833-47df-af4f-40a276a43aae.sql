
-- Anyone authenticated can read APKs (entregadores baixam após cadastro)
CREATE POLICY "APK read all authenticated"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'apks');

-- Super admin pode gerenciar (upload/update/delete)
CREATE POLICY "APK super_admin insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'apks' AND public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "APK super_admin update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'apks' AND public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "APK super_admin delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'apks' AND public.has_role(auth.uid(), 'super_admin'));
