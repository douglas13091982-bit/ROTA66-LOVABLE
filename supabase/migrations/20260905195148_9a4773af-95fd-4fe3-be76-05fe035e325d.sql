-- 1) search_path fixo
ALTER FUNCTION public.haversine_km(numeric, numeric, numeric, numeric) SET search_path = public;

-- 2) Turnos / mensalidades: comparar cidade sem COALESCE (NULL nunca casa)
DROP POLICY IF EXISTS "Super admin vê todos os turnos" ON public.agendamentos;
CREATE POLICY "Super admin vê todos os turnos"
ON public.agendamentos FOR SELECT TO authenticated
USING (
  has_role_scoped(auth.uid(), 'super_admin'::app_role)
  AND (
    is_franquia_owner(auth.uid())
    OR public.admin_ve_loja(auth.uid(), agendamentos.loja_id)
  )
);

DROP POLICY IF EXISTS "Super admin vê todas mensalidades" ON public.mensalidades_loja;
CREATE POLICY "Super admin vê todas mensalidades"
ON public.mensalidades_loja FOR SELECT TO authenticated
USING (
  has_role_scoped(auth.uid(), 'super_admin'::app_role)
  AND (
    is_franquia_owner(auth.uid())
    OR public.admin_ve_loja(auth.uid(), mensalidades_loja.loja_id)
  )
);

DROP POLICY IF EXISTS "Super admin gerencia mensalidades" ON public.mensalidades_loja;
CREATE POLICY "Super admin gerencia mensalidades"
ON public.mensalidades_loja FOR ALL TO authenticated
USING (
  has_role_scoped(auth.uid(), 'super_admin'::app_role)
  AND (
    is_franquia_owner(auth.uid())
    OR public.admin_ve_loja(auth.uid(), mensalidades_loja.loja_id)
  )
)
WITH CHECK (
  has_role_scoped(auth.uid(), 'super_admin'::app_role)
  AND (
    is_franquia_owner(auth.uid())
    OR public.admin_ve_loja(auth.uid(), mensalidades_loja.loja_id)
  )
);

-- 3) Saques das lojas: escopo por cidade
DROP POLICY IF EXISTS "Super admin lê todos os saques da loja" ON public.lojas_saques;
CREATE POLICY "Super admin lê todos os saques da loja"
ON public.lojas_saques FOR SELECT TO authenticated
USING (
  is_franquia_owner(auth.uid())
  OR (
    (has_role_scoped(auth.uid(), 'super_admin'::app_role) OR has_role_scoped(auth.uid(), 'admin'::app_role))
    AND public.admin_ve_loja(auth.uid(), lojas_saques.loja_id)
  )
);

DROP POLICY IF EXISTS "Super admin atualiza saques da loja" ON public.lojas_saques;
CREATE POLICY "Super admin atualiza saques da loja"
ON public.lojas_saques FOR UPDATE TO authenticated
USING (
  is_franquia_owner(auth.uid())
  OR (
    (has_role_scoped(auth.uid(), 'super_admin'::app_role) OR has_role_scoped(auth.uid(), 'admin'::app_role))
    AND public.admin_ve_loja(auth.uid(), lojas_saques.loja_id)
  )
);

-- 4) Funções SECURITY DEFINER: fechar para PUBLIC/anon, liberar só o necessário
DO $$
DECLARE
  f record;
  publicas text[] := ARRAY[
    'convite_loja_publico','calcular_taxa_publica','cpf_disponivel','buscar_indicador_por_codigo',
    'loja_tem_catalogo_publico','loja_aberta_agora','rastrear_pedido','status_pagamento_pedido',
    'get_mp_public_config','solicitar_reset_senha','validar_token_reset','get_taxa_sistema',
    'get_taxa_sistema_loja','calcular_prazo_coleta_min','calcular_tarifa_global','haversine_km',
    'cidade_slug','pedidos_pool_externo'
  ];
  internas text[] := ARRAY[
    'aplicar_movimento_entregador_saque','aplicar_movimento_loja_saldo','aplicar_credito_entregador',
    'debitar_mensalidade_do_saldo','cobrar_mensalidades_entregador','gerar_cobrancas_semanais_lojas',
    'gerar_mensalidades_do_dia','processar_mensalidades_vencidas','expirar_coletas_atrasadas',
    'check_system_alerts','get_private_config','get_mp_config_dono','get_pix_sistema',
    'salvar_mp_config','processar_ofertas_externas','desvincular_pedidos_turno_encerrado',
    'redespachar_pedido_turno','redespachar_pedidos_loja','assign_first_user_super_admin',
    'assign_role_from_metadata','handle_new_user','create_profile_from_signup'
  ];
BEGIN
  FOR f IN
    SELECT p.oid,
           p.proname,
           pg_get_function_identity_arguments(p.oid) AS args,
           pg_get_function_result(p.oid) = 'trigger' AS is_trigger
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated', f.proname, f.args);

    IF f.is_trigger OR f.proname = ANY(internas) THEN
      CONTINUE;
    END IF;

    IF f.proname = ANY(publicas) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO anon, authenticated', f.proname, f.args);
    ELSE
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated', f.proname, f.args);
    END IF;
  END LOOP;
END $$;

-- Funções não-DEFINER usadas publicamente continuam acessíveis
GRANT EXECUTE ON FUNCTION public.haversine_km(numeric, numeric, numeric, numeric) TO anon, authenticated;