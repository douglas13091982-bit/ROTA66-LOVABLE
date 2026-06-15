CREATE OR REPLACE FUNCTION public.get_taxa_sistema()
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT taxa_por_pedido
  FROM public.config_financeiro
  WHERE singleton = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_taxa_sistema() TO authenticated;