-- 1) Restringe a tabela ao dono real da plataforma
DROP POLICY IF EXISTS "super_admin manage cce" ON public.config_creditos_entregador;

CREATE POLICY "Owner da plataforma gerencia cce"
ON public.config_creditos_entregador
FOR ALL
TO authenticated
USING (public.is_franquia_owner(auth.uid()))
WITH CHECK (public.is_franquia_owner(auth.uid()));

-- 2) Leitura administrativa (inclui public key e token mascarado) só para o dono
CREATE OR REPLACE FUNCTION public.get_config_creditos_admin()
RETURNS TABLE(ativo boolean, mensalidade_valor numeric, dia_vencimento integer, saldo_minimo numeric, mp_configurado boolean, mp_public_key text, mp_access_token_masked text, valores_recarga_sugeridos numeric[])
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    c.ativo, c.mensalidade_valor, c.dia_vencimento, c.saldo_minimo,
    EXISTS (
      SELECT 1 FROM public.private_config pc
      WHERE pc.key = 'mp_platform_access_token'
        AND length(coalesce(pc.value, '')) > 0
    ) AS mp_configurado,
    (SELECT pc.value FROM public.private_config pc WHERE pc.key = 'mp_platform_public_key') AS mp_public_key,
    (
      SELECT CASE
        WHEN pc.value IS NOT NULL AND length(pc.value) > 8
          THEN repeat('•', 10) || right(pc.value, 4)
        ELSE NULL
      END
      FROM public.private_config pc
      WHERE pc.key = 'mp_platform_access_token'
    ) AS mp_access_token_masked,
    c.valores_recarga_sugeridos
  FROM public.config_creditos_entregador c
  WHERE c.singleton = true
    AND public.is_franquia_owner(auth.uid());
$function$;

-- 3) Gravação: só o dono, e credenciais vão para o armazenamento privado
CREATE OR REPLACE FUNCTION public.salvar_config_creditos(_ativo boolean, _mensalidade numeric, _dia integer, _saldo_minimo numeric, _mp_access_token text, _mp_public_key text, _valores_sugeridos numeric[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_franquia_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  UPDATE public.config_creditos_entregador
     SET ativo = _ativo,
         mensalidade_valor = GREATEST(0, _mensalidade),
         dia_vencimento = LEAST(28, GREATEST(1, _dia)),
         saldo_minimo = _saldo_minimo,
         mp_access_token = NULL,
         mp_public_key = NULL,
         valores_recarga_sugeridos = COALESCE(_valores_sugeridos, ARRAY[10,25,50,100]::numeric[]),
         updated_at = now()
   WHERE singleton = true;

  IF NULLIF(trim(coalesce(_mp_access_token, '')), '') IS NOT NULL THEN
    INSERT INTO public.private_config (key, value)
    VALUES ('mp_platform_access_token', trim(_mp_access_token))
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
  END IF;

  IF NULLIF(trim(coalesce(_mp_public_key, '')), '') IS NOT NULL THEN
    INSERT INTO public.private_config (key, value)
    VALUES ('mp_platform_public_key', trim(_mp_public_key))
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
  END IF;
END;
$function$;

-- 4) Remove cópias legadas das credenciais da tabela de configuração
UPDATE public.config_creditos_entregador
   SET mp_access_token = NULL, mp_public_key = NULL
 WHERE mp_access_token IS NOT NULL OR mp_public_key IS NOT NULL;