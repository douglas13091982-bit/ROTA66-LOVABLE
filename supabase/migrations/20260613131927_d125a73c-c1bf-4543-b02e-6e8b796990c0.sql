ALTER VIEW public.lojas_publicas SET (security_invoker = false);
GRANT SELECT ON public.lojas_publicas TO anon, authenticated;