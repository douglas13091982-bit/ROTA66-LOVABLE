-- Trigger functions don't need to be callable by clients
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM PUBLIC, anon, authenticated;

-- has_role is used inside RLS policies (evaluated with definer rights via SECURITY DEFINER),
-- but we still restrict direct execution to authenticated users only
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;