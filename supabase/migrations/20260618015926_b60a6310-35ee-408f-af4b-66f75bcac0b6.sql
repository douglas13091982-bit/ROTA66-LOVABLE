CREATE OR REPLACE FUNCTION public.get_ganho_hoje(_entregador_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(SUM(
    COALESCE(p.taxa_entrega, 0) + COALESCE(p.bonus_entregador, 0)
  ), 0)::numeric
  FROM public.pedidos p
  WHERE p.entregador_id = _entregador_id
    AND p.status = 'entregue'
    AND COALESCE(p.entrega_confirmada_em, p.updated_at)
        >= (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo');
$function$;