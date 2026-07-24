
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS chegou_coleta_at timestamptz;

CREATE OR REPLACE FUNCTION public.entregador_chegou_coleta(_pedido_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entregador uuid;
  v_rota uuid;
  v_status text;
  v_qtd integer := 0;
  v_novo_deadline timestamptz := now() + interval '5 minutes';
BEGIN
  SELECT entregador_id, rota_id, status
    INTO v_entregador, v_rota, v_status
    FROM public.pedidos
    WHERE id = _pedido_id;

  IF v_entregador IS NULL OR v_entregador <> auth.uid() THEN
    RAISE EXCEPTION 'Pedido não pertence a este entregador';
  END IF;

  IF v_status <> 'em_rota' THEN
    RETURN 0;
  END IF;

  IF v_rota IS NOT NULL THEN
    UPDATE public.pedidos
       SET deadline_coleta_at = GREATEST(deadline_coleta_at, v_novo_deadline),
           chegou_coleta_at = COALESCE(chegou_coleta_at, now()),
           updated_at = now()
     WHERE rota_id = v_rota
       AND entregador_id = v_entregador
       AND status = 'em_rota'
       AND deadline_coleta_at IS NOT NULL;
    GET DIAGNOSTICS v_qtd = ROW_COUNT;
  ELSE
    UPDATE public.pedidos
       SET deadline_coleta_at = GREATEST(deadline_coleta_at, v_novo_deadline),
           chegou_coleta_at = COALESCE(chegou_coleta_at, now()),
           updated_at = now()
     WHERE id = _pedido_id
       AND entregador_id = v_entregador
       AND status = 'em_rota'
       AND deadline_coleta_at IS NOT NULL;
    GET DIAGNOSTICS v_qtd = ROW_COUNT;
  END IF;

  RETURN v_qtd;
END;
$$;

DROP FUNCTION IF EXISTS public.entregadores_online_loja(uuid);
DROP FUNCTION IF EXISTS public.entregadores_online_admin();

CREATE FUNCTION public.entregadores_online_loja(_loja_id uuid)
 RETURNS TABLE(entregador_id uuid, full_name text, phone text, lat numeric, lng numeric, updated_at timestamp with time zone, stage text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH ttl AS (
    SELECT COALESCE((SELECT entregador_online_ttl_min FROM public.config_roteirizacao WHERE singleton = true LIMIT 1), 10) AS m
  ),
  base AS (
    SELECT s.entregador_id, p.full_name, p.phone, s.lat, s.lng, s.updated_at
    FROM public.entregador_status s
    LEFT JOIN public.profiles p ON p.id = s.entregador_id
    WHERE public.is_loja_owner(auth.uid(), _loja_id)
      AND s.lat IS NOT NULL
      AND s.lng IS NOT NULL
      AND (
        (
          s.online = true
          AND s.updated_at > now() - ((SELECT m FROM ttl) || ' minutes')::interval
          AND EXISTS (
            SELECT 1 FROM public.loja_entregadores le
            WHERE le.entregador_id = s.entregador_id
              AND le.loja_id = _loja_id
              AND le.ativo = true
          )
        )
        OR EXISTS (
          SELECT 1 FROM public.pedidos pe
          WHERE pe.entregador_id = s.entregador_id
            AND pe.loja_id = _loja_id
            AND pe.status NOT IN ('entregue','cancelado')
        )
      )
  ),
  ativo AS (
    SELECT DISTINCT ON (pe.entregador_id)
           pe.entregador_id,
           pe.status::text AS status,
           pe.chegou_coleta_at
      FROM public.pedidos pe
     WHERE pe.entregador_id IN (SELECT entregador_id FROM base)
       AND pe.status NOT IN ('entregue','cancelado')
     ORDER BY pe.entregador_id,
              CASE pe.status::text
                WHEN 'coletado' THEN 1
                WHEN 'em_rota' THEN 2
                ELSE 3
              END,
              pe.updated_at DESC
  )
  SELECT b.entregador_id, b.full_name, b.phone, b.lat, b.lng, b.updated_at,
         CASE
           WHEN a.status = 'coletado' THEN 'em_rota_entrega'
           WHEN a.status = 'em_rota' AND a.chegou_coleta_at IS NOT NULL THEN 'chegou_coleta'
           WHEN a.status = 'em_rota' THEN 'indo_coletar'
           ELSE 'livre'
         END AS stage
  FROM base b
  LEFT JOIN ativo a ON a.entregador_id = b.entregador_id;
$function$;

CREATE FUNCTION public.entregadores_online_admin()
 RETURNS TABLE(entregador_id uuid, full_name text, phone text, lat numeric, lng numeric, updated_at timestamp with time zone, stage text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH base AS (
    SELECT s.entregador_id, p.full_name, p.phone, s.lat, s.lng, s.updated_at
    FROM public.entregador_status s
    LEFT JOIN public.profiles p ON p.id = s.entregador_id
    WHERE public.admin_ve_profile(auth.uid(), s.entregador_id)
      AND s.online = true
      AND s.lat IS NOT NULL
      AND s.lng IS NOT NULL
      AND s.updated_at > now() - (
        COALESCE((SELECT entregador_online_ttl_min FROM public.config_roteirizacao WHERE singleton = true LIMIT 1), 10)
        || ' minutes'
      )::interval
  ),
  ativo AS (
    SELECT DISTINCT ON (pe.entregador_id)
           pe.entregador_id,
           pe.status::text AS status,
           pe.chegou_coleta_at
      FROM public.pedidos pe
     WHERE pe.entregador_id IN (SELECT entregador_id FROM base)
       AND pe.status NOT IN ('entregue','cancelado')
     ORDER BY pe.entregador_id,
              CASE pe.status::text
                WHEN 'coletado' THEN 1
                WHEN 'em_rota' THEN 2
                ELSE 3
              END,
              pe.updated_at DESC
  )
  SELECT b.entregador_id, b.full_name, b.phone, b.lat, b.lng, b.updated_at,
         CASE
           WHEN a.status = 'coletado' THEN 'em_rota_entrega'
           WHEN a.status = 'em_rota' AND a.chegou_coleta_at IS NOT NULL THEN 'chegou_coleta'
           WHEN a.status = 'em_rota' THEN 'indo_coletar'
           ELSE 'livre'
         END AS stage
  FROM base b
  LEFT JOIN ativo a ON a.entregador_id = b.entregador_id;
$function$;
