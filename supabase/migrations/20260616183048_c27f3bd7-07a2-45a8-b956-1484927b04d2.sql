CREATE OR REPLACE FUNCTION public.get_config_creditos_entregador()
RETURNS TABLE(
  ativo boolean, mensalidade_valor numeric, dia_vencimento integer,
  saldo_minimo numeric, mp_configurado boolean,
  valores_recarga_sugeridos numeric[]
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    c.ativo, c.mensalidade_valor, c.dia_vencimento, c.saldo_minimo,
    EXISTS (
      SELECT 1 FROM public.private_config pc
      WHERE pc.key = 'mp_platform_access_token'
        AND length(coalesce(pc.value, '')) > 0
    ) AS mp_configurado,
    c.valores_recarga_sugeridos
  FROM public.config_creditos_entregador c
  WHERE c.singleton = true;
$$;

CREATE OR REPLACE FUNCTION public.get_config_creditos_admin()
RETURNS TABLE(
  ativo boolean, mensalidade_valor numeric, dia_vencimento integer,
  saldo_minimo numeric, mp_configurado boolean, mp_public_key text,
  mp_access_token_masked text, valores_recarga_sugeridos numeric[]
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
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
    AND public.has_role(auth.uid(), 'super_admin'::public.app_role);
$$;