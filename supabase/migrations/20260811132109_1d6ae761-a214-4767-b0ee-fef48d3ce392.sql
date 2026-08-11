-- 1. Remover TODAS as políticas que mencionam 'Revendedor' ou usam 'is_revendedor_da_loja'
DROP POLICY IF EXISTS "Revendedor le suas lojas" ON public.lojas;
DROP POLICY IF EXISTS "Revendedor edita suas lojas" ON public.lojas;
DROP POLICY IF EXISTS "Revendedor le produtos das suas lojas" ON public.produtos;
DROP POLICY IF EXISTS "Revendedor le pedidos das suas lojas" ON public.pedidos;
DROP POLICY IF EXISTS "Revendedor le mensalidades das suas lojas" ON public.mensalidades_loja;
DROP POLICY IF EXISTS "Revendedor le cobrancas das suas lojas" ON public.cobrancas_loja;
DROP POLICY IF EXISTS "Revendedor le saldo das suas lojas" ON public.lojas_saldo;
DROP POLICY IF EXISTS "Revendedor le agendamentos das suas lojas" ON public.agendamentos;

-- 2. Remover tabelas e objetos do sistema de revendedores
DROP TABLE IF EXISTS public.revendedor_convites_loja CASCADE;
DROP TABLE IF EXISTS public.revendedor_saques CASCADE;
DROP TABLE IF EXISTS public.revendedor_cobrancas CASCADE;
DROP TABLE IF EXISTS public.revendedores CASCADE;

-- 3. Limpar coluna de referência em lojas
ALTER TABLE public.lojas DROP COLUMN IF EXISTS revendedor_id;

-- 4. Remover funções de revendedor
DROP FUNCTION IF EXISTS public.buscar_revendedor_por_codigo(text);
DROP FUNCTION IF EXISTS public.gerar_codigo_revendedor();
DROP FUNCTION IF EXISTS public.set_codigo_indicacao_revendedor();
DROP FUNCTION IF EXISTS public.is_revendedor_da_loja(uuid);
DROP FUNCTION IF EXISTS public.gerar_cobrancas_revendedores_mensal();

-- 5. Reforçar segurança do franqueado (City-scoped admin) usando city_id
DROP POLICY IF EXISTS "admin_ve_loja_policy" ON public.lojas;
CREATE POLICY "admin_ve_loja_policy" ON public.lojas
FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin') OR 
  (public.has_role(auth.uid(), 'admin') AND city_id = (SELECT city_id FROM public.profiles WHERE id = auth.uid()))
);

DROP POLICY IF EXISTS "admin_insere_loja_policy" ON public.lojas;
CREATE POLICY "admin_insere_loja_policy" ON public.lojas
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') OR 
  (public.has_role(auth.uid(), 'admin') AND city_id = (SELECT city_id FROM public.profiles WHERE id = auth.uid()))
);

-- 6. Limpar registros de role 'revendedor'
DELETE FROM public.user_roles WHERE role = 'revendedor';
