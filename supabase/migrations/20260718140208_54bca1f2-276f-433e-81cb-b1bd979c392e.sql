
CREATE TABLE public.push_admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sender_user_id UUID NOT NULL,
  franqueado_efetivo_id UUID,
  user_id UUID NOT NULL,
  entregador_nome TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  url TEXT,
  tag TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  http_status INT,
  sent INT DEFAULT 0,
  error TEXT
);
CREATE INDEX idx_push_admin_logs_sender ON public.push_admin_logs(sender_user_id, created_at DESC);
CREATE INDEX idx_push_admin_logs_franq ON public.push_admin_logs(franqueado_efetivo_id, created_at DESC);
CREATE INDEX idx_push_admin_logs_tag ON public.push_admin_logs(tag);

GRANT SELECT ON public.push_admin_logs TO authenticated;
GRANT ALL ON public.push_admin_logs TO service_role;
ALTER TABLE public.push_admin_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super admin ve tudo" ON public.push_admin_logs
  FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "sender ve seus envios" ON public.push_admin_logs
  FOR SELECT USING (sender_user_id = auth.uid() OR franqueado_efetivo_id = auth.uid());
