ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pix_chave text;

CREATE OR REPLACE FUNCTION public.get_entregador_pedido(_pedido_id uuid)
RETURNS TABLE(entregador_id uuid, full_name text, phone text, pix_chave text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.phone, p.pix_chave
  FROM public.pedidos pe
  JOIN public.profiles p ON p.id = pe.entregador_id
  WHERE pe.id = _pedido_id
    AND pe.entregador_id IS NOT NULL
    AND (
      public.is_loja_owner(auth.uid(), pe.loja_id)
      OR auth.uid() = pe.entregador_id
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_entregador_pedido(uuid) TO authenticated;