CREATE OR REPLACE FUNCTION public.aprovar_reset_senha(_request_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _token TEXT;
  _row public.password_reset_requests;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO _row FROM public.password_reset_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF _row.status <> 'pendente' THEN RAISE EXCEPTION 'invalid_status'; END IF;

  IF _row.user_id IS NULL THEN
    UPDATE public.password_reset_requests
       SET status = 'rejeitado',
           observacao = 'E-mail não cadastrado no sistema.',
           resolved_by = auth.uid(),
           resolved_at = now()
     WHERE id = _request_id;
    RETURN jsonb_build_object('ok', false, 'message', 'E-mail não cadastrado.');
  END IF;

  -- Gera token sem depender de pgcrypto: combina 2 uuids (64 chars hex)
  _token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

  UPDATE public.password_reset_requests
     SET status = 'aprovado',
         token = _token,
         token_expires_at = now() + interval '24 hours',
         resolved_by = auth.uid(),
         resolved_at = now()
   WHERE id = _request_id;

  RETURN jsonb_build_object('ok', true, 'token', _token, 'expires_at', (now() + interval '24 hours'));
END;
$function$;