-- Restaura permissão de execução das funções usadas nas políticas de RLS.
-- Sem isso, qualquer consulta a tabelas cujas políticas chamam essas funções
-- falha com "permission denied for function has_role" (403).
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_loja_owner(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_entregador_aprovado(uuid) TO authenticated, anon;