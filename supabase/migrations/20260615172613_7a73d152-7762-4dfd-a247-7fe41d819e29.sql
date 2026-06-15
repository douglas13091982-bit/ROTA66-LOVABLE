
-- 1) Remover exposição pública de colunas sensíveis em public.lojas
DROP POLICY IF EXISTS "Publico ve lojas com catalogo ativo" ON public.lojas;
REVOKE SELECT ON public.lojas FROM anon;

-- 2) Corrigir INSERT: dono pode criar a própria loja sem precisar de papel prévio
DROP POLICY IF EXISTS "Dono cria loja" ON public.lojas;
CREATE POLICY "Dono cria loja"
ON public.lojas
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

-- 3) Trigger: ao criar a primeira loja, concede automaticamente o papel loja_admin
CREATE OR REPLACE FUNCTION public.tg_lojas_grant_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.owner_id, 'loja_admin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lojas_grant_admin_role ON public.lojas;
CREATE TRIGGER trg_lojas_grant_admin_role
AFTER INSERT ON public.lojas
FOR EACH ROW
EXECUTE FUNCTION public.tg_lojas_grant_admin_role();
