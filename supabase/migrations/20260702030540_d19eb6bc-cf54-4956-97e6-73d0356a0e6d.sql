
-- Restringir escrita ao owner (is_franquia_owner) em configurações globais.
-- Franqueados de cidade continuam lendo, mas não editam.

-- BRANDING
DROP POLICY IF EXISTS "Super admin gerencia branding" ON public.config_branding;
CREATE POLICY "Owner gerencia branding" ON public.config_branding
  FOR ALL TO authenticated
  USING (public.is_franquia_owner(auth.uid()))
  WITH CHECK (public.is_franquia_owner(auth.uid()));

-- TARIFAS GLOBAIS
DROP POLICY IF EXISTS "Super admin gerencia tarifas" ON public.tarifas_globais;
CREATE POLICY "Owner gerencia tarifas" ON public.tarifas_globais
  FOR ALL TO authenticated
  USING (public.is_franquia_owner(auth.uid()))
  WITH CHECK (public.is_franquia_owner(auth.uid()));

-- PLANOS DE LOJA
DROP POLICY IF EXISTS "super_admin gerencia planos" ON public.planos_loja;
CREATE POLICY "Owner gerencia planos" ON public.planos_loja
  FOR ALL TO authenticated
  USING (public.is_franquia_owner(auth.uid()))
  WITH CHECK (public.is_franquia_owner(auth.uid()));

-- ROTEIRIZAÇÃO
DROP POLICY IF EXISTS "Super admin gerencia config" ON public.config_roteirizacao;
CREATE POLICY "Owner gerencia config roteirizacao" ON public.config_roteirizacao
  FOR ALL TO authenticated
  USING (public.is_franquia_owner(auth.uid()))
  WITH CHECK (public.is_franquia_owner(auth.uid()));

-- SOM DE NOTIFICAÇÃO
DROP POLICY IF EXISTS "Super admin gerencia config som" ON public.config_notificacao_som;
CREATE POLICY "Owner gerencia config som" ON public.config_notificacao_som
  FOR ALL TO authenticated
  USING (public.is_franquia_owner(auth.uid()))
  WITH CHECK (public.is_franquia_owner(auth.uid()));

-- ANÚNCIOS DO ENTREGADOR
DROP POLICY IF EXISTS "Super admin gerencia anuncios entregador" ON public.anuncios_entregador;
CREATE POLICY "Owner gerencia anuncios entregador" ON public.anuncios_entregador
  FOR ALL TO authenticated
  USING (public.is_franquia_owner(auth.uid()))
  WITH CHECK (public.is_franquia_owner(auth.uid()));

-- CONTRATOS
DROP POLICY IF EXISTS "Super admin atualiza contratos" ON public.contratos;
DROP POLICY IF EXISTS "Super admin insere contratos" ON public.contratos;
DROP POLICY IF EXISTS "Super admin remove contratos" ON public.contratos;
CREATE POLICY "Owner atualiza contratos" ON public.contratos
  FOR UPDATE TO authenticated
  USING (public.is_franquia_owner(auth.uid()))
  WITH CHECK (public.is_franquia_owner(auth.uid()));
CREATE POLICY "Owner insere contratos" ON public.contratos
  FOR INSERT TO authenticated
  WITH CHECK (public.is_franquia_owner(auth.uid()));
CREATE POLICY "Owner remove contratos" ON public.contratos
  FOR DELETE TO authenticated
  USING (public.is_franquia_owner(auth.uid()));

-- CATEGORIAS DE LOJA
DROP POLICY IF EXISTS "Super admin pode atualizar categorias" ON public.loja_categorias;
DROP POLICY IF EXISTS "Super admin pode excluir categorias" ON public.loja_categorias;
DROP POLICY IF EXISTS "Super admin pode inserir categorias" ON public.loja_categorias;
CREATE POLICY "Owner atualiza categorias" ON public.loja_categorias
  FOR UPDATE TO authenticated
  USING (public.is_franquia_owner(auth.uid()))
  WITH CHECK (public.is_franquia_owner(auth.uid()));
CREATE POLICY "Owner insere categorias" ON public.loja_categorias
  FOR INSERT TO authenticated
  WITH CHECK (public.is_franquia_owner(auth.uid()));
CREATE POLICY "Owner exclui categorias" ON public.loja_categorias
  FOR DELETE TO authenticated
  USING (public.is_franquia_owner(auth.uid()));
