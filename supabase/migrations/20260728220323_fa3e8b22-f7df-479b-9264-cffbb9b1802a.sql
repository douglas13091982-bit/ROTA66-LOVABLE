CREATE OR REPLACE FUNCTION public.listar_entregadores_loja(_loja_id uuid)
 RETURNS TABLE(vinculo_id uuid, ativo boolean, created_at timestamp with time zone, entregador_id uuid, full_name text, phone text, avatar_url text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH acesso AS (
    SELECT (
      public.is_loja_owner(auth.uid(), _loja_id)
      OR public.is_loja_funcionario(auth.uid(), _loja_id)
      OR public.admin_ve_loja(auth.uid(), _loja_id)
    ) AS ok
  )
  SELECT le.id, le.ativo, le.created_at, le.entregador_id, p.full_name, p.phone, p.avatar_url
  FROM public.loja_entregadores le
  LEFT JOIN public.profiles p ON p.id = le.entregador_id
  CROSS JOIN acesso a
  WHERE le.loja_id = _loja_id AND a.ok

  UNION

  SELECT NULL::uuid, true, MIN(pe.created_at), pe.entregador_id, p.full_name, p.phone, p.avatar_url
  FROM public.pedidos pe
  LEFT JOIN public.profiles p ON p.id = pe.entregador_id
  CROSS JOIN acesso a
  WHERE pe.loja_id = _loja_id
    AND pe.entregador_id IS NOT NULL
    AND pe.status NOT IN ('entregue','cancelado')
    AND a.ok
    AND NOT EXISTS (
      SELECT 1 FROM public.loja_entregadores le2
      WHERE le2.loja_id = _loja_id AND le2.entregador_id = pe.entregador_id
    )
  GROUP BY pe.entregador_id, p.full_name, p.phone, p.avatar_url
  ORDER BY 3 DESC;
$function$;