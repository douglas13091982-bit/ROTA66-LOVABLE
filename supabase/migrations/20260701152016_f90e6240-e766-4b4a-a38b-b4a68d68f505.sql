
-- 1. Coluna com código único
ALTER TABLE public.revendedores
  ADD COLUMN IF NOT EXISTS codigo_indicacao text UNIQUE;

-- 2. Função geradora de código aleatório A-Z0-9
CREATE OR REPLACE FUNCTION public.gerar_codigo_revendedor()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i int;
  attempts int := 0;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..8 LOOP
      code := code || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    END LOOP;
    code := 'R' || code;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.revendedores WHERE codigo_indicacao = code);
    attempts := attempts + 1;
    IF attempts > 20 THEN
      RAISE EXCEPTION 'Não foi possível gerar código único';
    END IF;
  END LOOP;
  RETURN code;
END;
$$;

-- 3. Trigger para gerar código automaticamente
CREATE OR REPLACE FUNCTION public.set_codigo_indicacao_revendedor()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.codigo_indicacao IS NULL OR NEW.codigo_indicacao = '' THEN
    NEW.codigo_indicacao := public.gerar_codigo_revendedor();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_codigo_revendedor ON public.revendedores;
CREATE TRIGGER trg_set_codigo_revendedor
  BEFORE INSERT ON public.revendedores
  FOR EACH ROW EXECUTE FUNCTION public.set_codigo_indicacao_revendedor();

-- 4. Backfill dos existentes
UPDATE public.revendedores
  SET codigo_indicacao = public.gerar_codigo_revendedor()
  WHERE codigo_indicacao IS NULL;

-- 5. RPC de lookup público
CREATE OR REPLACE FUNCTION public.buscar_revendedor_por_codigo(_codigo text)
RETURNS TABLE(user_id uuid, nome text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.user_id, r.nome
  FROM public.revendedores r
  WHERE upper(r.codigo_indicacao) = upper(_codigo)
    AND r.ativo = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.buscar_revendedor_por_codigo(text) TO anon, authenticated;
