
-- 1) aplicar_credito_entregador: usada por webhook MP e por RPCs SECURITY DEFINER.
--    Não deve ser invocável pelo cliente final.
REVOKE ALL ON FUNCTION public.aplicar_credito_entregador(uuid, numeric, public.entregador_credito_tipo, text, text, date, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.aplicar_credito_entregador(uuid, numeric, public.entregador_credito_tipo, text, text, date, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.aplicar_credito_entregador(uuid, numeric, public.entregador_credito_tipo, text, text, date, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.aplicar_credito_entregador(uuid, numeric, public.entregador_credito_tipo, text, text, date, uuid) TO service_role;

-- 2) get_private_config: leitura de segredos internos (push_trigger_secret, etc.).
--    Só o service_role pode chamar.
REVOKE ALL ON FUNCTION public.get_private_config(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_private_config(text) FROM anon;
REVOKE ALL ON FUNCTION public.get_private_config(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_private_config(text) TO service_role;
