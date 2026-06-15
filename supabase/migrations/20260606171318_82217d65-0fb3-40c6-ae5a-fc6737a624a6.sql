
-- 1) Flag de opt-in no perfil do entregador
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS aceita_pedidos_externos boolean NOT NULL DEFAULT false;

-- 2) Função: a loja tem algum entregador próprio efetivamente ONLINE?
CREATE OR REPLACE FUNCTION public.loja_tem_entregador_proprio_online(_loja_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.loja_entregadores le
    JOIN public.entregador_status s ON s.entregador_id = le.entregador_id
    WHERE le.loja_id = _loja_id
      AND le.ativo = true
      AND s.online = true
      AND s.updated_at > now() - (
        COALESCE((SELECT entregador_online_ttl_min FROM public.config_roteirizacao WHERE singleton = true LIMIT 1), 10)
        || ' minutes'
      )::interval
  );
$$;

-- 3) Função: calcula tarifa global para um número de km (usa tarifa de moto)
CREATE OR REPLACE FUNCTION public.calcular_tarifa_global(_km numeric)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  _t public.tarifas_globais%ROWTYPE;
  _valor numeric;
  _km_extra numeric;
BEGIN
  IF _km IS NULL OR _km < 0 THEN _km := 0; END IF;

  SELECT * INTO _t
  FROM public.tarifas_globais
  WHERE ativa = true
    AND tipo_veiculo = 'moto'
    AND _km >= faixa_km_min
    AND _km <= faixa_km_max
  ORDER BY faixa_km_min ASC
  LIMIT 1;

  IF NOT FOUND THEN
    -- Pega a faixa de maior cobertura (km máx mais alto) e aplica km extra
    SELECT * INTO _t
    FROM public.tarifas_globais
    WHERE ativa = true AND tipo_veiculo = 'moto'
    ORDER BY faixa_km_max DESC
    LIMIT 1;
    IF NOT FOUND THEN RETURN 0; END IF;
    _km_extra := GREATEST(0, _km - _t.faixa_km_max);
  ELSE
    _km_extra := 0;
  END IF;

  _valor := COALESCE(_t.valor, 0) + _km_extra * COALESCE(_t.valor_por_km, 0);
  RETURN GREATEST(_valor, COALESCE(_t.valor_minimo, 0));
END;
$$;

-- 4) Helper RPC para LER pedidos do pool externo (bypass de RLS de forma controlada).
--    Permite ao front mostrar SOMENTE pedidos cuja loja não tem entregador próprio online,
--    para quem está com a flag aceita_pedidos_externos = true.
CREATE OR REPLACE FUNCTION public.pedidos_pool_externo()
RETURNS SETOF public.pedidos
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.*
  FROM public.pedidos p
  WHERE EXISTS (
          SELECT 1 FROM public.profiles pr
          WHERE pr.id = auth.uid() AND pr.aceita_pedidos_externos = true
        )
    AND public.is_entregador_aprovado(auth.uid())
    AND p.status = 'pronto'::pedido_status
    AND p.entregador_id IS NULL
    AND NOT public.loja_tem_entregador_proprio_online(p.loja_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.loja_entregadores le
      WHERE le.loja_id = p.loja_id AND le.entregador_id = auth.uid() AND le.ativo = true
    )
  ORDER BY p.created_at ASC;
$$;

-- 5) RPC para ACEITAR pedido como externo (atômica, recalcula tarifa global)
CREATE OR REPLACE FUNCTION public.aceitar_pedido_externo(_pedido_id uuid)
RETURNS public.pedidos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _p public.pedidos%ROWTYPE;
  _flag boolean;
  _km numeric;
  _nova_taxa numeric;
BEGIN
  -- Valida flag
  SELECT aceita_pedidos_externos INTO _flag FROM public.profiles WHERE id = auth.uid();
  IF NOT COALESCE(_flag, false) THEN
    RAISE EXCEPTION 'Você não está habilitado como entregador externo';
  END IF;

  IF NOT public.is_entregador_aprovado(auth.uid()) THEN
    RAISE EXCEPTION 'Sua conta de entregador ainda não foi aprovada';
  END IF;

  SELECT * INTO _p FROM public.pedidos WHERE id = _pedido_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
  IF _p.entregador_id IS NOT NULL THEN
    RAISE EXCEPTION 'Pedido já foi aceito por outro entregador';
  END IF;
  IF _p.status <> 'pronto'::pedido_status THEN
    RAISE EXCEPTION 'Pedido não está mais disponível';
  END IF;
  IF public.loja_tem_entregador_proprio_online(_p.loja_id) THEN
    RAISE EXCEPTION 'Essa loja agora tem entregador próprio online';
  END IF;

  -- Recalcula a tarifa pela tabela global
  _km := public.haversine_km(
    _p.endereco_coleta_lat, _p.endereco_coleta_lng,
    _p.endereco_entrega_lat, _p.endereco_entrega_lng
  );
  _nova_taxa := COALESCE(public.calcular_tarifa_global(_km), _p.taxa_entrega);

  UPDATE public.pedidos
     SET entregador_id = auth.uid(),
         status = 'em_rota'::pedido_status,
         taxa_entrega = _nova_taxa,
         valor_total = COALESCE(valor_produtos, 0) + _nova_taxa
   WHERE id = _pedido_id
     AND entregador_id IS NULL
     AND status = 'pronto'::pedido_status
   RETURNING * INTO _p;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não pôde ser aceito (já foi pego)';
  END IF;

  RETURN _p;
END;
$$;

-- 6) Permissões nas funções RPC para o cliente autenticado
GRANT EXECUTE ON FUNCTION public.pedidos_pool_externo() TO authenticated;
GRANT EXECUTE ON FUNCTION public.aceitar_pedido_externo(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calcular_tarifa_global(numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.loja_tem_entregador_proprio_online(uuid) TO authenticated;
