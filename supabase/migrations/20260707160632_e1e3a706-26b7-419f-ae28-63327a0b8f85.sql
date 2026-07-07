CREATE OR REPLACE FUNCTION public.pedidos_pool_externo()
RETURNS TABLE(
  id uuid,
  numero integer,
  loja_id uuid,
  cliente_user_id uuid,
  cliente_nome text,
  cliente_telefone text,
  endereco_entrega text,
  cidade text,
  complemento text,
  itens jsonb,
  valor_produtos numeric,
  taxa_entrega numeric,
  valor_total numeric,
  forma_pagamento forma_pagamento,
  troco_para numeric,
  status pedido_status,
  entregador_id uuid,
  observacoes text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  codigo_coleta text,
  codigo_entrega text,
  endereco_coleta text,
  coleta_confirmada_em timestamp with time zone,
  entrega_confirmada_em timestamp with time zone,
  arquivado boolean,
  rota_id uuid,
  rota_ordem integer,
  atribuido_automaticamente boolean,
  endereco_entrega_lat numeric,
  endereco_coleta_lat numeric,
  endereco_entrega_lng numeric,
  endereco_coleta_lng numeric,
  duracao_estimada_seg integer,
  distancia_metros integer,
  eta_chegada_at timestamp with time zone,
  bonus_entregador numeric,
  entrega_paga_em timestamp with time zone,
  entrega_paga boolean,
  oferta_expira_em timestamp with time zone,
  loja_nome text,
  loja_bairro text,
  loja_plano_mensal_ativo boolean,
  loja_taxa_por_pedido numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _scope text;
  _aceita_ext boolean;
  _uid uuid;
  _raio_km numeric;
  _ent_lat numeric;
  _ent_lng numeric;
  _ent_veic text;
  _bike_eletrica boolean := false;
BEGIN
  _uid := auth.uid();
  IF NOT public.is_entregador_aprovado(_uid) THEN
    RETURN;
  END IF;

  SELECT pool_aberto_scope, COALESCE(raio_maximo_coleta_km, 0)
    INTO _scope, _raio_km
    FROM public.config_roteirizacao LIMIT 1;
  _scope := COALESCE(_scope, 'vinculados_e_externos');

  SELECT COALESCE(pr.aceita_pedidos_externos, false), pr.tipo_veiculo::text
    INTO _aceita_ext, _ent_veic
    FROM public.profiles pr WHERE pr.id = _uid;

  IF _ent_veic = 'bike_eletrica' THEN
    _bike_eletrica := true;
    IF _raio_km <= 0 THEN
      _raio_km := 4;
    ELSE
      _raio_km := LEAST(_raio_km, 4);
    END IF;
  END IF;

  SELECT es.lat, es.lng INTO _ent_lat, _ent_lng
    FROM public.entregador_status es
   WHERE es.entregador_id = _uid
     AND es.updated_at > now() - interval '30 minutes';

  RETURN QUERY
  SELECT p.id, p.numero, p.loja_id, p.cliente_user_id, p.cliente_nome, p.cliente_telefone,
         p.endereco_entrega, p.cidade, p.complemento, p.itens, p.valor_produtos, p.taxa_entrega,
         p.valor_total, p.forma_pagamento, p.troco_para, p.status, p.entregador_id, p.observacoes,
         p.created_at, p.updated_at, p.codigo_coleta, p.codigo_entrega, p.endereco_coleta,
         p.coleta_confirmada_em, p.entrega_confirmada_em, p.arquivado, p.rota_id, p.rota_ordem,
         p.atribuido_automaticamente, p.endereco_entrega_lat, p.endereco_coleta_lat,
         p.endereco_entrega_lng, p.endereco_coleta_lng, p.duracao_estimada_seg, p.distancia_metros,
         p.eta_chegada_at, p.bonus_entregador, p.entrega_paga_em, p.entrega_paga,
         NULL::timestamptz AS oferta_expira_em,
         l.nome AS loja_nome,
         l.bairro AS loja_bairro,
         CASE
           WHEN COALESCE(l.avulsa_plataforma, false) THEN true
           ELSE COALESCE(l.plano_mensal_ativo, false)
         END AS loja_plano_mensal_ativo,
         CASE
           WHEN COALESCE(l.avulsa_plataforma, false) THEN 0::numeric
           ELSE COALESCE(p.taxa_por_pedido_aplicada, l.taxa_por_pedido, 0)
         END AS loja_taxa_por_pedido
    FROM public.pedidos p
    JOIN public.lojas l ON l.id = p.loja_id
    LEFT JOIN public.lojas_saldo ls ON ls.loja_id = p.loja_id
   WHERE p.status = 'pronto'::pedido_status
     AND p.entregador_id IS NULL
     AND COALESCE(ls.saldo, 0) >= COALESCE(p.taxa_entrega, 0)
     AND (
       (_scope IN ('somente_vinculados','vinculados_e_externos')
         AND EXISTS (
           SELECT 1 FROM public.loja_entregadores le
            WHERE le.loja_id = p.loja_id
              AND le.entregador_id = _uid
              AND le.ativo = true
         ))
       OR
       (_scope IN ('somente_externos','vinculados_e_externos')
         AND _aceita_ext
         AND NOT public.loja_tem_entregador_proprio_online(p.loja_id))
     )
     AND (
       _raio_km <= 0
       OR _ent_lat IS NULL OR _ent_lng IS NULL
       OR p.endereco_coleta_lat IS NULL OR p.endereco_coleta_lng IS NULL
       OR (
         6371 * 2 * asin(sqrt(
           power(sin(radians((p.endereco_coleta_lat - _ent_lat)/2)), 2)
           + cos(radians(_ent_lat)) * cos(radians(p.endereco_coleta_lat))
             * power(sin(radians((p.endereco_coleta_lng - _ent_lng)/2)), 2)
         ))
       ) <= _raio_km
     )
     AND (
       NOT _bike_eletrica
       OR (
         p.endereco_coleta_lat IS NOT NULL AND p.endereco_coleta_lng IS NOT NULL
         AND p.endereco_entrega_lat IS NOT NULL AND p.endereco_entrega_lng IS NOT NULL
         AND (
           6371 * 2 * asin(sqrt(
             power(sin(radians((p.endereco_entrega_lat - p.endereco_coleta_lat)/2)), 2)
             + cos(radians(p.endereco_coleta_lat)) * cos(radians(p.endereco_entrega_lat))
               * power(sin(radians((p.endereco_entrega_lng - p.endereco_coleta_lng)/2)), 2)
           ))
         ) <= 4
       )
     )
   ORDER BY p.created_at ASC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.aceitar_pedido_externo(_pedido_id uuid)
RETURNS pedidos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _p public.pedidos%ROWTYPE;
  _km numeric;
  _frete numeric;
  _taxa_plano numeric;
  _nova_taxa numeric;
  _scope text;
  _vinculado boolean;
  _aceita_ext boolean;
  _tipo public.tipo_veiculo;
  _max_paradas integer;
  _ativos integer;
  _km_entrega numeric;
  _avulsa boolean;
BEGIN
  IF NOT public.is_entregador_aprovado(auth.uid()) THEN
    RAISE EXCEPTION 'Sua conta de entregador ainda não foi aprovada';
  END IF;

  SELECT tipo_veiculo INTO _tipo FROM public.profiles WHERE id = auth.uid();
  SELECT CASE
           WHEN COALESCE(_tipo, 'moto'::public.tipo_veiculo) = 'moto'::public.tipo_veiculo
             THEN COALESCE(max_paradas_por_rota, 5)
           ELSE COALESCE(max_paradas_por_rota_carro, 20)
         END
    INTO _max_paradas
    FROM public.config_roteirizacao LIMIT 1;
  _max_paradas := COALESCE(_max_paradas, CASE WHEN _tipo = 'moto' THEN 5 ELSE 20 END);

  SELECT COUNT(*) INTO _ativos
    FROM public.pedidos
   WHERE entregador_id = auth.uid()
     AND status IN ('em_rota'::pedido_status, 'coletado'::pedido_status);

  IF _ativos >= _max_paradas THEN
    RAISE EXCEPTION 'Limite de % pedidos ativos atingido. Conclua entregas antes de aceitar mais.', _max_paradas;
  END IF;

  SELECT * INTO _p FROM public.pedidos WHERE id = _pedido_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
  IF _p.entregador_id IS NOT NULL THEN
    RAISE EXCEPTION 'Pedido já foi aceito por outro entregador';
  END IF;
  IF _p.status <> 'pronto'::pedido_status THEN
    RAISE EXCEPTION 'Pedido não está mais disponível';
  END IF;

  IF _tipo = 'bike_eletrica'::public.tipo_veiculo THEN
    IF _p.endereco_coleta_lat IS NULL OR _p.endereco_coleta_lng IS NULL
       OR _p.endereco_entrega_lat IS NULL OR _p.endereco_entrega_lng IS NULL THEN
      RAISE EXCEPTION 'Pedido sem coordenadas suficientes para bike elétrica';
    END IF;
    _km_entrega := public.haversine_km(
      _p.endereco_coleta_lat, _p.endereco_coleta_lng,
      _p.endereco_entrega_lat, _p.endereco_entrega_lng
    );
    IF _km_entrega > 4 THEN
      RAISE EXCEPTION 'Distância da entrega (% km) excede o limite de 4 km para bike elétrica', round(_km_entrega::numeric, 2);
    END IF;
  END IF;

  SELECT pool_aberto_scope INTO _scope FROM public.config_roteirizacao LIMIT 1;
  _scope := COALESCE(_scope, 'vinculados_e_externos');

  SELECT EXISTS (
    SELECT 1 FROM public.loja_entregadores le
     WHERE le.loja_id = _p.loja_id
       AND le.entregador_id = auth.uid()
       AND le.ativo = true
  ) INTO _vinculado;

  SELECT COALESCE(pr.aceita_pedidos_externos, false) INTO _aceita_ext
    FROM public.profiles pr WHERE pr.id = auth.uid();

  IF _vinculado AND _scope IN ('somente_vinculados','vinculados_e_externos') THEN
    NULL;
  ELSIF NOT _vinculado
        AND _scope IN ('somente_externos','vinculados_e_externos')
        AND _aceita_ext
        AND NOT public.loja_tem_entregador_proprio_online(_p.loja_id) THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'Este pedido não está disponível para você';
  END IF;

  SELECT COALESCE(l.avulsa_plataforma, false)
    INTO _avulsa
    FROM public.lojas l
   WHERE l.id = _p.loja_id;

  IF COALESCE(_avulsa, false) THEN
    -- Pedido avulso: mantém exatamente o frete calculado/cobrado na página pública.
    _nova_taxa := COALESCE(_p.taxa_entrega, 0);
  ELSE
    _km := public.haversine_km(
      _p.endereco_coleta_lat, _p.endereco_coleta_lng,
      _p.endereco_entrega_lat, _p.endereco_entrega_lng
    );
    _frete := COALESCE(public.calcular_tarifa_global(_km), GREATEST(_p.taxa_entrega - COALESCE(_p.taxa_por_pedido_aplicada, 0), 0));
    _taxa_plano := COALESCE(_p.taxa_por_pedido_aplicada, 0);
    _nova_taxa := _frete + _taxa_plano;
  END IF;

  PERFORM set_config('app.bypass_pedido_guard', 'on', true);

  UPDATE public.pedidos
     SET entregador_id = auth.uid(),
         status = 'em_rota'::pedido_status,
         taxa_entrega = _nova_taxa,
         valor_total = COALESCE(valor_produtos, 0) + _nova_taxa,
         taxa_por_pedido_aplicada = CASE
           WHEN COALESCE(_avulsa, false) THEN 0
           ELSE taxa_por_pedido_aplicada
         END
   WHERE id = _pedido_id
     AND entregador_id IS NULL
     AND status = 'pronto'::pedido_status
   RETURNING * INTO _p;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido já foi aceito por outro entregador';
  END IF;

  UPDATE public.pedido_ofertas
     SET status = 'aceito'
   WHERE pedido_id = _pedido_id
     AND entregador_id = auth.uid()
     AND status = 'ativo';

  RETURN _p;
END;
$function$;

UPDATE public.pedidos p
   SET taxa_por_pedido_aplicada = 0,
       valor_total = COALESCE(p.valor_produtos, 0) + COALESCE(p.taxa_entrega, 0)
  FROM public.lojas l
 WHERE l.id = p.loja_id
   AND COALESCE(l.avulsa_plataforma, false) = true
   AND p.status NOT IN ('entregue'::pedido_status, 'cancelado'::pedido_status);