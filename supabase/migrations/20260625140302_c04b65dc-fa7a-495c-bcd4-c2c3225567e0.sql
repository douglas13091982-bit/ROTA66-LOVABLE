
-- 1) Coluna de código de indicação em profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS codigo_indicacao text UNIQUE;

-- 2) Função para gerar código curto único (8 chars alfanuméricos maiúsculos sem ambíguos)
CREATE OR REPLACE FUNCTION public.gerar_codigo_indicacao()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  v_exists boolean;
  i int;
BEGIN
  LOOP
    v_code := '';
    FOR i IN 1..8 LOOP
      v_code := v_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE codigo_indicacao = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_code;
END;
$$;

-- 3) Trigger para preencher codigo_indicacao em novos profiles
CREATE OR REPLACE FUNCTION public.set_codigo_indicacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.codigo_indicacao IS NULL THEN
    NEW.codigo_indicacao := public.gerar_codigo_indicacao();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_codigo_indicacao ON public.profiles;
CREATE TRIGGER trg_set_codigo_indicacao
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_codigo_indicacao();

-- 4) Backfill para profiles existentes (executar em loop p/ garantir unicidade)
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.profiles WHERE codigo_indicacao IS NULL LOOP
    UPDATE public.profiles SET codigo_indicacao = public.gerar_codigo_indicacao() WHERE id = r.id;
  END LOOP;
END $$;

-- 5) Coluna em lojas referenciando o entregador que indicou
ALTER TABLE public.lojas
  ADD COLUMN IF NOT EXISTS indicado_por_entregador_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lojas_indicado_por ON public.lojas(indicado_por_entregador_id);

-- 6) RPC pública: dado um código, retorna id+nome do indicador (uso durante cadastro)
CREATE OR REPLACE FUNCTION public.buscar_indicador_por_codigo(_codigo text)
RETURNS TABLE (id uuid, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name
  FROM public.profiles p
  WHERE upper(p.codigo_indicacao) = upper(_codigo)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.buscar_indicador_por_codigo(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.buscar_indicador_por_codigo(text) TO anon, authenticated;
