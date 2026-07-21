CREATE OR REPLACE FUNCTION public.get_ganho_hoje(_entregador_id uuid)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(SUM(m.valor), 0)::numeric
  FROM public.entregadores_saldo_saque_movimentos m
  WHERE m.entregador_id = _entregador_id
    AND m.tipo = 'credito_entrega'
    AND m.created_at
        >= (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo');
$function$;

GRANT EXECUTE ON FUNCTION public.get_ganho_hoje(uuid) TO authenticated, service_role;