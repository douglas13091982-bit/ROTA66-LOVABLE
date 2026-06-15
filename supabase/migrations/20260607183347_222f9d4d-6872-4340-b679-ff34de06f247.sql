ALTER TABLE public.config_notificacao_som
  ADD COLUMN IF NOT EXISTS audio_path text;

CREATE POLICY "Autenticados leem som notificacao"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'notificacao-som');

CREATE POLICY "Super admin envia som notificacao"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'notificacao-som' AND has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admin atualiza som notificacao"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'notificacao-som' AND has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (bucket_id = 'notificacao-som' AND has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admin remove som notificacao"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'notificacao-som' AND has_role(auth.uid(), 'super_admin'::app_role));