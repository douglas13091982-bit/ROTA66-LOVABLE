
CREATE TABLE public.password_reset_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovado','rejeitado','usado','expirado')),
  token TEXT UNIQUE,
  token_expires_at TIMESTAMPTZ,
  observacao TEXT,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_password_reset_status ON public.password_reset_requests(status, created_at DESC);
CREATE INDEX idx_password_reset_token ON public.password_reset_requests(token) WHERE token IS NOT NULL;

GRANT SELECT, UPDATE ON public.password_reset_requests TO authenticated;
GRANT ALL ON public.password_reset_requests TO service_role;

ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins veem todos os pedidos"
  ON public.password_reset_requests FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins atualizam pedidos"
  ON public.password_reset_requests FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.password_reset_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_password_reset_updated_at
  BEFORE UPDATE ON public.password_reset_requests
  FOR EACH ROW EXECUTE FUNCTION public.password_reset_set_updated_at();

CREATE OR REPLACE FUNCTION public.solicitar_reset_senha(_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _normalized TEXT;
  _recent_count INT;
BEGIN
  _normalized := lower(trim(_email));
  IF _normalized IS NULL OR _normalized = '' OR position('@' in _normalized) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'message', 'E-mail inválido.');
  END IF;

  SELECT count(*) INTO _recent_count
  FROM public.password_reset_requests
  WHERE lower(email) = _normalized
    AND status IN ('pendente','aprovado')
    AND created_at > now() - interval '1 hour';
  IF _recent_count >= 3 THEN
    RETURN jsonb_build_object('ok', true, 'message', 'Se o e-mail estiver cadastrado, o pedido será analisado pelo administrador.');
  END IF;

  SELECT id INTO _user_id FROM auth.users WHERE lower(email) = _normalized LIMIT 1;

  INSERT INTO public.password_reset_requests (email, user_id)
  VALUES (_normalized, _user_id);

  RETURN jsonb_build_object('ok', true, 'message', 'Se o e-mail estiver cadastrado, o pedido será analisado pelo administrador.');
END;
$$;

GRANT EXECUTE ON FUNCTION public.solicitar_reset_senha(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.aprovar_reset_senha(_request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  _token := encode(gen_random_bytes(24), 'hex');

  UPDATE public.password_reset_requests
     SET status = 'aprovado',
         token = _token,
         token_expires_at = now() + interval '24 hours',
         resolved_by = auth.uid(),
         resolved_at = now()
   WHERE id = _request_id;

  RETURN jsonb_build_object('ok', true, 'token', _token, 'expires_at', (now() + interval '24 hours'));
END;
$$;

GRANT EXECUTE ON FUNCTION public.aprovar_reset_senha(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.rejeitar_reset_senha(_request_id UUID, _motivo TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.password_reset_requests
     SET status = 'rejeitado',
         observacao = _motivo,
         resolved_by = auth.uid(),
         resolved_at = now()
   WHERE id = _request_id AND status = 'pendente';
  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rejeitar_reset_senha(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.validar_token_reset(_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.password_reset_requests;
BEGIN
  SELECT * INTO _row FROM public.password_reset_requests WHERE token = _token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Link inválido.');
  END IF;
  IF _row.status <> 'aprovado' THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Link já utilizado ou cancelado.');
  END IF;
  IF _row.token_expires_at < now() THEN
    UPDATE public.password_reset_requests SET status = 'expirado' WHERE id = _row.id;
    RETURN jsonb_build_object('ok', false, 'message', 'Link expirado.');
  END IF;
  RETURN jsonb_build_object('ok', true, 'email', _row.email);
END;
$$;

GRANT EXECUTE ON FUNCTION public.validar_token_reset(TEXT) TO anon, authenticated;
