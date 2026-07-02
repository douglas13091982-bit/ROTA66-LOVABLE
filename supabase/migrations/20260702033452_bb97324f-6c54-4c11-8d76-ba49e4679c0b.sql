
-- 1) Tabela cidades
CREATE TABLE public.cidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  uf text NOT NULL CHECK (char_length(uf) = 2),
  slug text NOT NULL UNIQUE,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.cidades TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.cidades TO authenticated;
GRANT ALL ON public.cidades TO service_role;

ALTER TABLE public.cidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos leem cidades ativas"
  ON public.cidades FOR SELECT
  USING (ativo = true OR public.is_franquia_owner(auth.uid()));

CREATE POLICY "Owner gerencia cidades"
  ON public.cidades FOR ALL
  USING (public.is_franquia_owner(auth.uid()))
  WITH CHECK (public.is_franquia_owner(auth.uid()));

CREATE TRIGGER trg_cidades_updated_at
  BEFORE UPDATE ON public.cidades
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Helper de normalização (nome + uf -> slug)
CREATE OR REPLACE FUNCTION public.cidade_slug(_nome text, _uf text)
RETURNS text
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT lower(
    regexp_replace(
      translate(
        coalesce(_nome,'') || '-' || coalesce(_uf,''),
        'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
        'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'
      ),
      '[^a-z0-9]+', '-', 'g'
    )
  );
$$;

-- 3) Backfill cidades a partir de dados existentes (uf desconhecida = 'XX' quando não houver)
INSERT INTO public.cidades (nome, uf, slug)
SELECT DISTINCT
  src.cidade,
  coalesce(nullif(src.uf,''), 'XX') AS uf,
  public.cidade_slug(src.cidade, coalesce(nullif(src.uf,''), 'XX'))
FROM (
  SELECT cidade, estado AS uf FROM public.lojas WHERE cidade IS NOT NULL
  UNION
  SELECT cidade, estado AS uf FROM public.profiles WHERE cidade IS NOT NULL
  UNION
  SELECT cidade, NULL::text AS uf FROM public.franqueados_config WHERE cidade IS NOT NULL
) src
ON CONFLICT (slug) DO NOTHING;

-- 4) Adiciona city_id nas tabelas
ALTER TABLE public.lojas             ADD COLUMN city_id uuid REFERENCES public.cidades(id);
ALTER TABLE public.profiles          ADD COLUMN city_id uuid REFERENCES public.cidades(id);
ALTER TABLE public.franqueados_config ADD COLUMN city_id uuid REFERENCES public.cidades(id);

-- 5) Backfill city_id (match por slug, com fallback de UF 'XX' quando estado for nulo)
UPDATE public.lojas l
SET city_id = c.id
FROM public.cidades c
WHERE l.cidade IS NOT NULL
  AND c.slug = public.cidade_slug(l.cidade, coalesce(nullif(l.estado,''), 'XX'));

UPDATE public.profiles p
SET city_id = c.id
FROM public.cidades c
WHERE p.cidade IS NOT NULL
  AND c.slug = public.cidade_slug(p.cidade, coalesce(nullif(p.estado,''), 'XX'));

UPDATE public.franqueados_config f
SET city_id = c.id
FROM public.cidades c
WHERE f.cidade IS NOT NULL
  AND c.slug = public.cidade_slug(f.cidade, 'XX');

CREATE INDEX idx_lojas_city_id    ON public.lojas(city_id);
CREATE INDEX idx_profiles_city_id ON public.profiles(city_id);
CREATE INDEX idx_franqueados_config_city_id ON public.franqueados_config(city_id);

-- 6) Trigger de sincronização: quando city_id muda, preencher cidade/estado a partir de cidades
CREATE OR REPLACE FUNCTION public.sync_cidade_from_city_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  c_nome text;
  c_uf   text;
BEGIN
  IF NEW.city_id IS NOT NULL THEN
    SELECT nome, uf INTO c_nome, c_uf FROM public.cidades WHERE id = NEW.city_id;
    IF c_nome IS NOT NULL THEN
      NEW.cidade := c_nome;
      IF TG_TABLE_NAME <> 'franqueados_config' THEN
        NEW.estado := c_uf;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_lojas_sync_cidade
  BEFORE INSERT OR UPDATE OF city_id ON public.lojas
  FOR EACH ROW EXECUTE FUNCTION public.sync_cidade_from_city_id();

CREATE TRIGGER trg_profiles_sync_cidade
  BEFORE INSERT OR UPDATE OF city_id ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_cidade_from_city_id();

CREATE TRIGGER trg_franqueados_config_sync_cidade
  BEFORE INSERT OR UPDATE OF city_id ON public.franqueados_config
  FOR EACH ROW EXECUTE FUNCTION public.sync_cidade_from_city_id();

-- 7) Novas funções para RLS por city_id
CREATE OR REPLACE FUNCTION public.cidade_id_do_franqueado(_uid uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT city_id FROM public.franqueados_config WHERE user_id = _uid LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.admin_ve_city_id(_uid uuid, _city_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_uid, 'super_admin'::app_role)
     AND (
       public.is_franquia_owner(_uid)
       OR _city_id IS NOT DISTINCT FROM public.cidade_id_do_franqueado(_uid)
     );
$$;
