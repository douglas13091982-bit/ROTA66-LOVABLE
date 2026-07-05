-- Helper: admin pode ver/gerenciar recursos de uma loja específica.
-- Reaproveita admin_ve_city_id resolvendo o city_id da loja.
CREATE OR REPLACE FUNCTION public.admin_ve_loja(_uid uuid, _loja_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
      FROM public.lojas l
     WHERE l.id = _loja_id
       AND public.admin_ve_city_id(_uid, l.city_id)
  );
$function$;

REVOKE ALL ON FUNCTION public.admin_ve_loja(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_ve_loja(uuid, uuid) TO authenticated, service_role;

-- ============================================================
-- PRODUTOS: substituir policy global do super_admin por versão
-- com escopo por cidade (owner da franquia vê tudo; franqueado
-- vê só as lojas da própria cidade).
-- ============================================================
DROP POLICY IF EXISTS "Super admin gerencia produtos" ON public.produtos;

CREATE POLICY "Admin da franquia gerencia produtos da loja"
  ON public.produtos
  FOR ALL
  TO authenticated
  USING (public.admin_ve_loja(auth.uid(), loja_id))
  WITH CHECK (public.admin_ve_loja(auth.uid(), loja_id));

-- ============================================================
-- CLIENTES_LOJA: dar acesso de leitura e edição ao admin.
-- ============================================================
DROP POLICY IF EXISTS "Admin da franquia gerencia clientes da loja" ON public.clientes_loja;
CREATE POLICY "Admin da franquia gerencia clientes da loja"
  ON public.clientes_loja
  FOR ALL
  TO authenticated
  USING (public.admin_ve_loja(auth.uid(), loja_id))
  WITH CHECK (public.admin_ve_loja(auth.uid(), loja_id));

-- ============================================================
-- LOJAS_ENDERECOS_COLETA: idem.
-- ============================================================
DROP POLICY IF EXISTS "Admin da franquia gerencia enderecos de coleta" ON public.lojas_enderecos_coleta;
CREATE POLICY "Admin da franquia gerencia enderecos de coleta"
  ON public.lojas_enderecos_coleta
  FOR ALL
  TO authenticated
  USING (public.admin_ve_loja(auth.uid(), loja_id))
  WITH CHECK (public.admin_ve_loja(auth.uid(), loja_id));