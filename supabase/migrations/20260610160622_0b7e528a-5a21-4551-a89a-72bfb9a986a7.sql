
-- 1) Tabela de auditoria
CREATE TABLE public.avatar_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id uuid,
  event text NOT NULL CHECK (event IN ('upload_ok','upload_fail','avatar_changed','rls_denied','validation_failed')),
  storage_path text,
  previous_avatar_url text,
  new_avatar_url text,
  mime_type text,
  size_bytes bigint,
  error_code text,
  error_message text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_avatar_audit_user ON public.avatar_audit_log(user_id, created_at DESC);
CREATE INDEX idx_avatar_audit_event ON public.avatar_audit_log(event, created_at DESC);

-- 2) Grants (sem anon — só usuários autenticados)
GRANT SELECT ON public.avatar_audit_log TO authenticated;
GRANT ALL ON public.avatar_audit_log TO service_role;

-- 3) RLS
ALTER TABLE public.avatar_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê seus próprios logs"
  ON public.avatar_audit_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- INSERT é feito somente via função SECURITY DEFINER abaixo; nenhuma policy de INSERT
-- para clientes diretos — assim impedimos fabricação de logs arbitrários.

-- 4) Função RPC para o cliente registrar eventos de upload
CREATE OR REPLACE FUNCTION public.log_avatar_event(
  _event text,
  _storage_path text DEFAULT NULL,
  _mime_type text DEFAULT NULL,
  _size_bytes bigint DEFAULT NULL,
  _error_code text DEFAULT NULL,
  _error_message text DEFAULT NULL,
  _user_agent text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
  _msg text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  -- Aceitar apenas eventos vindos do cliente; 'avatar_changed' é exclusivo do trigger
  IF _event NOT IN ('upload_ok','upload_fail','rls_denied','validation_failed') THEN
    RAISE EXCEPTION 'Evento inválido';
  END IF;

  -- Sanitização: truncar para evitar logs gigantes / vazamentos
  _msg := left(COALESCE(_error_message, ''), 500);
  IF _msg = '' THEN _msg := NULL; END IF;

  INSERT INTO public.avatar_audit_log (
    user_id, actor_id, event, storage_path, mime_type, size_bytes,
    error_code, error_message, user_agent
  ) VALUES (
    auth.uid(), auth.uid(), _event,
    left(COALESCE(_storage_path, ''), 500),
    left(COALESCE(_mime_type, ''), 100),
    _size_bytes,
    left(COALESCE(_error_code, ''), 100),
    _msg,
    left(COALESCE(_user_agent, ''), 300)
  ) RETURNING id INTO _id;

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_avatar_event(text, text, text, bigint, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_avatar_event(text, text, text, bigint, text, text, text) TO authenticated;

-- 5) Trigger em profiles para registrar TODA mudança de avatar_url
CREATE OR REPLACE FUNCTION public.audit_profile_avatar_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.avatar_url IS DISTINCT FROM OLD.avatar_url THEN
    INSERT INTO public.avatar_audit_log (
      user_id, actor_id, event, previous_avatar_url, new_avatar_url
    ) VALUES (
      NEW.id, auth.uid(), 'avatar_changed',
      left(COALESCE(OLD.avatar_url, ''), 500),
      left(COALESCE(NEW.avatar_url, ''), 500)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_profile_avatar_change ON public.profiles;
CREATE TRIGGER trg_audit_profile_avatar_change
  AFTER UPDATE OF avatar_url ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_profile_avatar_change();
