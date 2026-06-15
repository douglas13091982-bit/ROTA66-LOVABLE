
-- Super admin pode ver status de localização de todos entregadores
CREATE POLICY "Super admin vê status entregadores"
  ON public.entregador_status
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- RPC: entregadores online de uma loja (com nome) - acessível pelo dono da loja
CREATE OR REPLACE FUNCTION public.entregadores_online_loja(_loja_id uuid)
RETURNS TABLE (
  entregador_id uuid,
  full_name text,
  phone text,
  lat numeric,
  lng numeric,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.entregador_id, p.full_name, p.phone, s.lat, s.lng, s.updated_at
  FROM public.entregador_status s
  JOIN public.loja_entregadores le
    ON le.entregador_id = s.entregador_id AND le.loja_id = _loja_id AND le.ativo = true
  LEFT JOIN public.profiles p ON p.id = s.entregador_id
  WHERE public.is_loja_owner(auth.uid(), _loja_id)
    AND s.online = true
    AND s.lat IS NOT NULL
    AND s.lng IS NOT NULL
    AND s.updated_at > now() - (
      COALESCE((SELECT entregador_online_ttl_min FROM public.config_roteirizacao WHERE singleton = true LIMIT 1), 10)
      || ' minutes'
    )::interval;
$$;

-- RPC: todos entregadores online - apenas super admin
CREATE OR REPLACE FUNCTION public.entregadores_online_admin()
RETURNS TABLE (
  entregador_id uuid,
  full_name text,
  phone text,
  lat numeric,
  lng numeric,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.entregador_id, p.full_name, p.phone, s.lat, s.lng, s.updated_at
  FROM public.entregador_status s
  LEFT JOIN public.profiles p ON p.id = s.entregador_id
  WHERE public.has_role(auth.uid(), 'super_admin'::app_role)
    AND s.online = true
    AND s.lat IS NOT NULL
    AND s.lng IS NOT NULL
    AND s.updated_at > now() - (
      COALESCE((SELECT entregador_online_ttl_min FROM public.config_roteirizacao WHERE singleton = true LIMIT 1), 10)
      || ' minutes'
    )::interval;
$$;
