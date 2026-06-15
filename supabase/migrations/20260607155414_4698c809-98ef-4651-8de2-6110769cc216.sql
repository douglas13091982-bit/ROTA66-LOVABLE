DROP FUNCTION IF EXISTS public.get_entregador_pedido(uuid);

CREATE OR REPLACE FUNCTION public.get_entregador_pedido(_pedido_id uuid)
 RETURNS TABLE(entregador_id uuid, full_name text, phone text, pix_chave text, avatar_url text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.id, p.full_name, p.phone, p.pix_chave, p.avatar_url
  FROM public.pedidos pe
  JOIN public.profiles p ON p.id = pe.entregador_id
  WHERE pe.id = _pedido_id
    AND pe.entregador_id IS NOT NULL
    AND (
      public.is_loja_owner(auth.uid(), pe.loja_id)
      OR auth.uid() = pe.entregador_id
      OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    );
$function$;