ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS cnpj text;
CREATE UNIQUE INDEX IF NOT EXISTS lojas_cnpj_unique ON public.lojas (cnpj) WHERE cnpj IS NOT NULL;

CREATE OR REPLACE FUNCTION public.is_valid_cnpj(_cnpj text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  s text;
  i int;
  sum int;
  d1 int;
  d2 int;
  w1 int[] := ARRAY[5,4,3,2,9,8,7,6,5,4,3,2];
  w2 int[] := ARRAY[6,5,4,3,2,9,8,7,6,5,4,3,2];
BEGIN
  IF _cnpj IS NULL THEN RETURN false; END IF;
  s := regexp_replace(_cnpj, '\D', '', 'g');
  IF length(s) <> 14 THEN RETURN false; END IF;
  IF s ~ '^(\d)\1{13}$' THEN RETURN false; END IF;
  sum := 0;
  FOR i IN 1..12 LOOP
    sum := sum + (substr(s,i,1)::int) * w1[i];
  END LOOP;
  d1 := sum % 11;
  d1 := CASE WHEN d1 < 2 THEN 0 ELSE 11 - d1 END;
  IF d1 <> substr(s,13,1)::int THEN RETURN false; END IF;
  sum := 0;
  FOR i IN 1..13 LOOP
    sum := sum + (substr(s,i,1)::int) * w2[i];
  END LOOP;
  d2 := sum % 11;
  d2 := CASE WHEN d2 < 2 THEN 0 ELSE 11 - d2 END;
  RETURN d2 = substr(s,14,1)::int;
END;
$$;

-- Normaliza CNPJ (somente dígitos) e valida antes de inserir/atualizar
CREATE OR REPLACE FUNCTION public.lojas_normalize_cnpj()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.cnpj IS NOT NULL THEN
    NEW.cnpj := regexp_replace(NEW.cnpj, '\D', '', 'g');
    IF NEW.cnpj = '' THEN
      NEW.cnpj := NULL;
    ELSIF NOT public.is_valid_cnpj(NEW.cnpj) THEN
      RAISE EXCEPTION 'CNPJ inválido';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lojas_normalize_cnpj ON public.lojas;
CREATE TRIGGER trg_lojas_normalize_cnpj
BEFORE INSERT OR UPDATE OF cnpj ON public.lojas
FOR EACH ROW EXECUTE FUNCTION public.lojas_normalize_cnpj();