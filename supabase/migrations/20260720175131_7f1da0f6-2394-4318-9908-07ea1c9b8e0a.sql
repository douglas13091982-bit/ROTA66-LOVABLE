
CREATE OR REPLACE FUNCTION public.tg_lojas_exigir_cidade()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.city_id IS NULL THEN
    RAISE EXCEPTION 'Cidade é obrigatória para a loja'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lojas_exigir_cidade ON public.lojas;
CREATE TRIGGER trg_lojas_exigir_cidade
BEFORE INSERT OR UPDATE OF city_id ON public.lojas
FOR EACH ROW
EXECUTE FUNCTION public.tg_lojas_exigir_cidade();
