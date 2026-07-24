CREATE OR REPLACE FUNCTION public.entregadores_online_loja(_loja_id uuid)
 RETURNS TABLE(entregador_id uuid, full_name text, phone text, lat numeric, lng numeric, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH ttl AS (
    SELECT COALESCE((SELECT entregador_online_ttl_min FROM public.config_roteirizacao WHERE singleton = true LIMIT 1), 10) AS m
  )
  SELECT s.entregador_id, p.full_name, p.phone, s.lat, s.lng, s.updated_at
  FROM public.entregador_status s
  LEFT JOIN public.profiles p ON p.id = s.entregador_id
  WHERE public.is_loja_owner(auth.uid(), _loja_id)
    AND s.lat IS NOT NULL
    AND s.lng IS NOT NULL
    AND (
      -- vinculado à loja: exige online + fresh
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
      -- ou tem pedido ativo dessa loja: mostra sempre até finalizar
      OR EXISTS (
        SELECT 1 FROM public.pedidos pe
        WHERE pe.entregador_id = s.entregador_id
          AND pe.loja_id = _loja_id
          AND pe.status NOT IN ('entregue','cancelado')
      )
    );
$function$;