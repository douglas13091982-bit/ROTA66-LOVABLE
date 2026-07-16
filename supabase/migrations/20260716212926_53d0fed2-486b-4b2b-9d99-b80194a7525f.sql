
-- 1) Config: prazo de coleta baseado em distância
ALTER TABLE public.config_roteirizacao
  ADD COLUMN IF NOT EXISTS coleta_tempo_base_min integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coleta_min_por_km numeric(6,2) NOT NULL DEFAULT 1.6,
  ADD COLUMN IF NOT EXISTS coleta_prazo_min_absoluto integer NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS coleta_prazo_max_absoluto integer NOT NULL DEFAULT 30;

-- 2) Pedidos: deadline para chegar na coleta
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS deadline_coleta_at timestamptz;

-- 3) Fórmula centralizada
CREATE OR REPLACE FUNCTION public.calcular_prazo_coleta_min(_dist_km numeric)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cfg record;
  bruto numeric;
BEGIN
  SELECT coleta_tempo_base_min, coleta_min_por_km,
         coleta_prazo_min_absoluto, coleta_prazo_max_absoluto
    INTO cfg
    FROM public.config_roteirizacao
    ORDER BY id
    LIMIT 1;

  IF cfg IS NULL THEN
    RETURN GREATEST(4, LEAST(30, COALESCE(ROUND(_dist_km * 1.6)::int, 10)));
  END IF;

  IF _dist_km IS NULL THEN
    bruto := cfg.coleta_tempo_base_min + 10;
  ELSE
    bruto := cfg.coleta_tempo_base_min + (_dist_km * cfg.coleta_min_por_km);
  END IF;

  RETURN GREATEST(cfg.coleta_prazo_min_absoluto,
                  LEAST(cfg.coleta_prazo_max_absoluto, ROUND(bruto)::int));
END;
$$;

-- 4) Trigger que seta/limpa deadline_coleta_at conforme entregador é atribuído
CREATE OR REPLACE FUNCTION public.tg_pedidos_deadline_coleta()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dist_km numeric;
  ent_lat numeric;
  ent_lng numeric;
BEGIN
  -- Atribuição de entregador → calcula prazo
  IF NEW.entregador_id IS NOT NULL
     AND (OLD.entregador_id IS DISTINCT FROM NEW.entregador_id)
     AND NEW.status IN ('em_rota') THEN

    SELECT lat, lng INTO ent_lat, ent_lng
      FROM public.entregador_status
      WHERE entregador_id = NEW.entregador_id;

    IF ent_lat IS NOT NULL AND ent_lng IS NOT NULL
       AND NEW.endereco_coleta_lat IS NOT NULL AND NEW.endereco_coleta_lng IS NOT NULL THEN
      -- Haversine simplificada em km
      dist_km := 6371 * 2 * asin(sqrt(
        power(sin(radians((NEW.endereco_coleta_lat - ent_lat)/2)), 2) +
        cos(radians(ent_lat)) * cos(radians(NEW.endereco_coleta_lat)) *
        power(sin(radians((NEW.endereco_coleta_lng - ent_lng)/2)), 2)
      ));
    ELSE
      dist_km := NULL;
    END IF;

    NEW.deadline_coleta_at := now() + make_interval(mins => public.calcular_prazo_coleta_min(dist_km));

  -- Coleta confirmada / pedido saiu de em_rota → limpa
  ELSIF OLD.deadline_coleta_at IS NOT NULL
        AND NEW.status IS DISTINCT FROM 'em_rota' THEN
    NEW.deadline_coleta_at := NULL;

  -- Devolução ao pool → limpa
  ELSIF NEW.entregador_id IS NULL AND OLD.entregador_id IS NOT NULL THEN
    NEW.deadline_coleta_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pedidos_deadline_coleta ON public.pedidos;
CREATE TRIGGER trg_pedidos_deadline_coleta
  BEFORE UPDATE ON public.pedidos
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_pedidos_deadline_coleta();

-- 5) Job: devolve pedidos com prazo estourado ao pool
CREATE OR REPLACE FUNCTION public.expirar_coletas_atrasadas()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  qtd integer := 0;
BEGIN
  WITH expirados AS (
    UPDATE public.pedidos
       SET entregador_id = NULL,
           rota_id = NULL,
           rota_ordem = NULL,
           codigo_coleta = NULL,
           deadline_coleta_at = NULL,
           status = 'disponivel',
           updated_at = now()
     WHERE status = 'em_rota'
       AND entregador_id IS NOT NULL
       AND deadline_coleta_at IS NOT NULL
       AND deadline_coleta_at < now()
    RETURNING id
  )
  SELECT count(*) INTO qtd FROM expirados;

  RETURN qtd;
END;
$$;

REVOKE ALL ON FUNCTION public.expirar_coletas_atrasadas() FROM public;
GRANT EXECUTE ON FUNCTION public.expirar_coletas_atrasadas() TO service_role, authenticated;

-- 6) Cron a cada minuto
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('expirar-coletas-atrasadas')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expirar-coletas-atrasadas');
    PERFORM cron.schedule(
      'expirar-coletas-atrasadas',
      '* * * * *',
      $c$ SELECT public.expirar_coletas_atrasadas(); $c$
    );
  END IF;
END $$;
