
CREATE OR REPLACE FUNCTION public.get_pix_sistema()
RETURNS TABLE(
  pix_chave_sistema text,
  pix_titular_sistema text,
  pix_cidade_sistema text,
  prazo_pagamento_dias integer,
  mensalidade_valor_padrao numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pix_chave_sistema, pix_titular_sistema, pix_cidade_sistema,
         prazo_pagamento_dias, mensalidade_valor_padrao
    FROM public.config_financeiro
   WHERE singleton = true
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_pix_sistema() FROM public;
GRANT EXECUTE ON FUNCTION public.get_pix_sistema() TO authenticated;
