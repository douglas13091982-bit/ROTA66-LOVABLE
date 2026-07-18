
CREATE POLICY "admin insere arquivos de documento entregador" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'entregador-documentos' AND public.admin_ve_profile(auth.uid(), ((storage.foldername(name))[1])::uuid));

CREATE POLICY "admin atualiza arquivos de documento entregador" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'entregador-documentos' AND public.admin_ve_profile(auth.uid(), ((storage.foldername(name))[1])::uuid))
WITH CHECK (bucket_id = 'entregador-documentos' AND public.admin_ve_profile(auth.uid(), ((storage.foldername(name))[1])::uuid));

INSERT INTO public.entregador_documentos (entregador_id, tipo_veiculo, status)
SELECT p.id, COALESCE(p.tipo_veiculo, 'moto'), 'pendente'
FROM public.profiles p
JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'entregador'
WHERE NOT EXISTS (SELECT 1 FROM public.entregador_documentos d WHERE d.entregador_id = p.id)
ON CONFLICT DO NOTHING;
