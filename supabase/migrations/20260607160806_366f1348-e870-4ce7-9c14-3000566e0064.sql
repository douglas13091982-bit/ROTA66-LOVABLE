DROP FUNCTION IF EXISTS public.listar_entregadores_loja(uuid);

CREATE OR REPLACE FUNCTION public.listar_entregadores_loja(_loja_id uuid)
 RETURNS TABLE(vinculo_id uuid, ativo boolean, created_at timestamp with time zone, entregador_id uuid, full_name text, phone text, avatar_url text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT le.id, le.ativo, le.created_at, le.entregador_id, p.full_name, p.phone, p.avatar_url
  FROM public.loja_entregadores le
  LEFT JOIN public.profiles p ON p.id = le.entregador_id
  WHERE le.loja_id = _loja_id
    AND public.is_loja_owner(auth.uid(), _loja_id)
  ORDER BY le.created_at DESC;
$function$;