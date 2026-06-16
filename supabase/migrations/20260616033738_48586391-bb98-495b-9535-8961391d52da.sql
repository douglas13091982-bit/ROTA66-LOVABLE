
CREATE OR REPLACE FUNCTION public.enforce_plano_para_vincular_entregador()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _plano boolean;
BEGIN
  SELECT COALESCE(plano_mensal_ativo, false) INTO _plano
  FROM public.lojas
  WHERE id = NEW.loja_id;

  IF NOT COALESCE(_plano, false) THEN
    RAISE EXCEPTION 'Loja sem plano mensal ativo não pode vincular entregadores'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_plano_vincular_entregador ON public.loja_entregadores;

CREATE TRIGGER trg_enforce_plano_vincular_entregador
BEFORE INSERT ON public.loja_entregadores
FOR EACH ROW
EXECUTE FUNCTION public.enforce_plano_para_vincular_entregador();
