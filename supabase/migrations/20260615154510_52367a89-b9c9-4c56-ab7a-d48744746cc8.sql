
CREATE OR REPLACE FUNCTION public.loja_aberta_agora(
  _horario jsonb,
  _usar_automatico boolean,
  _ativa boolean,
  _now timestamptz DEFAULT now()
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  _local timestamptz := _now AT TIME ZONE 'America/Sao_Paulo';
  _dow int;
  _dia text;
  _cfg jsonb;
  _ini text;
  _fim text;
  _ini_m int;
  _fim_m int;
  _now_m int;
BEGIN
  IF NOT _usar_automatico THEN
    RETURN COALESCE(_ativa, false);
  END IF;
  IF _horario IS NULL THEN
    RETURN false;
  END IF;
  _dow := EXTRACT(DOW FROM _local)::int;
  _dia := CASE _dow
    WHEN 0 THEN 'dom' WHEN 1 THEN 'seg' WHEN 2 THEN 'ter'
    WHEN 3 THEN 'qua' WHEN 4 THEN 'qui' WHEN 5 THEN 'sex'
    WHEN 6 THEN 'sab'
  END;
  _cfg := _horario -> _dia;
  IF _cfg IS NULL OR COALESCE((_cfg ->> 'aberto')::boolean, false) = false THEN
    RETURN false;
  END IF;
  _ini := _cfg ->> 'inicio';
  _fim := _cfg ->> 'fim';
  IF _ini IS NULL OR _fim IS NULL THEN
    RETURN false;
  END IF;
  _ini_m := split_part(_ini, ':', 1)::int * 60 + split_part(_ini, ':', 2)::int;
  _fim_m := split_part(_fim, ':', 1)::int * 60 + split_part(_fim, ':', 2)::int;
  _now_m := EXTRACT(HOUR FROM _local)::int * 60 + EXTRACT(MINUTE FROM _local)::int;
  IF _fim_m <= _ini_m THEN
    RETURN _now_m >= _ini_m OR _now_m < _fim_m;
  END IF;
  RETURN _now_m >= _ini_m AND _now_m < _fim_m;
END;
$$;

DROP VIEW IF EXISTS public.lojas_publicas;

CREATE VIEW public.lojas_publicas
WITH (security_invoker = true)
AS
SELECT
  id, nome, slug, telefone, endereco, endereco_lat, endereco_lng,
  cidade, estado, logo_url, taxa_entrega_base, horario_funcionamento,
  catalogo_ativo, catalogo_slug, catalogo_layout,
  public.loja_aberta_agora(horario_funcionamento, usar_horario_automatico, ativa) AS ativa,
  usar_horario_automatico,
  status, plano_mensal_ativo, categoria
FROM public.lojas
WHERE (
    (usar_horario_automatico = false AND ativa = true)
    OR usar_horario_automatico = true
  )
  AND status = 'aprovado'::status_moderacao;

GRANT SELECT ON public.lojas_publicas TO anon, authenticated;
