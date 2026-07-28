CREATE OR REPLACE FUNCTION public.enforce_plano_para_vincular_entregador()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ok boolean;
BEGIN
  SELECT (
    COALESCE(l.plano_mensal_ativo, false)
    OR l.plano_id IS NOT NULL
    OR COALESCE(l.mensalidade_valor, 0) > 0
  ) INTO _ok
  FROM public.lojas l
  WHERE l.id = NEW.loja_id;

  IF NOT COALESCE(_ok, false) THEN
    RAISE EXCEPTION 'Loja sem plano mensal ativo não pode vincular entregadores'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;