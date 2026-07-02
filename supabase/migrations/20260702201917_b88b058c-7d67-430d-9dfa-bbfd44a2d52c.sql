
CREATE OR REPLACE FUNCTION public.franqueados_resolve_city_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.city_id IS NULL AND NEW.cidade IS NOT NULL AND length(trim(NEW.cidade)) > 0 THEN
    SELECT id INTO NEW.city_id
      FROM public.cidades
     WHERE lower(nome) = lower(trim(NEW.cidade))
     LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_franqueados_resolve_city_id ON public.franqueados_config;
CREATE TRIGGER trg_franqueados_resolve_city_id
  BEFORE INSERT OR UPDATE OF cidade, city_id ON public.franqueados_config
  FOR EACH ROW EXECUTE FUNCTION public.franqueados_resolve_city_id();

UPDATE public.franqueados_config f
   SET city_id = c.id
  FROM public.cidades c
 WHERE f.city_id IS NULL
   AND f.cidade IS NOT NULL
   AND lower(c.nome) = lower(trim(f.cidade));
