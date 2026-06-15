-- Teste de regressão: gatilho recalcular_taxa_entregador_na_atribuicao
--
-- Garante que ao atribuir um entregador (próprio ou externo) a um pedido,
-- a taxa_entrega é sempre recalculada pela tarifa global do sistema,
-- aplicando a mesma lógica de aceitar_pedido_externo. Lojas com plano
-- mensal não devem mais conseguir aplicar desconto no repasse.
--
-- Como rodar:
--   psql "$SUPABASE_DB_URL" -f supabase/tests/recalcular_taxa_entregador.sql
--
-- Substitua os UUIDs abaixo por um loja_id válido (idealmente com plano
-- mensal ativo) e um entregador_id existente em auth.users. Cada caso
-- limpa o pedido de teste antes da asserção final, de forma que mesmo
-- numa falha não fica resíduo no banco.

\set loja_id        'COLE_AQUI_UUID_DA_LOJA'
\set entregador_id  'COLE_AQUI_UUID_DO_ENTREGADOR'

DO $$
DECLARE
  _loja_id uuid := :'loja_id'::uuid;
  _entregador_id uuid := :'entregador_id'::uuid;
  _pedido_id uuid;
  _taxa numeric;
  _valor_total numeric;
  _km numeric;
  _esperado numeric;
  _taxa_loja_descontada numeric := 5.60;
  _valor_produtos numeric := 50.00;
BEGIN
  -- ===== T1: atribuição com coordenadas → recalcula pela tarifa global =====
  INSERT INTO public.pedidos (
    loja_id, cliente_nome, cliente_telefone, endereco_entrega,
    valor_produtos, taxa_entrega, valor_total, status,
    endereco_coleta_lat, endereco_coleta_lng,
    endereco_entrega_lat, endereco_entrega_lng
  ) VALUES (
    _loja_id, 'QA TRIGGER T1', '00000000000', 'Rua Teste 123',
    _valor_produtos, _taxa_loja_descontada, _valor_produtos + _taxa_loja_descontada, 'pronto',
    -23.5505, -46.6333, -23.5605, -46.6433
  ) RETURNING id INTO _pedido_id;

  _km := public.haversine_km(-23.5505, -46.6333, -23.5605, -46.6433);
  _esperado := public.calcular_tarifa_global(_km);

  UPDATE public.pedidos
     SET entregador_id = _entregador_id, status = 'em_rota'
   WHERE id = _pedido_id;

  SELECT taxa_entrega, valor_total INTO _taxa, _valor_total
    FROM public.pedidos WHERE id = _pedido_id;
  DELETE FROM public.pedidos WHERE id = _pedido_id;

  IF _taxa <> _esperado THEN
    RAISE EXCEPTION 'T1 FALHOU: taxa após atribuição=% esperado=% (km=%)', _taxa, _esperado, _km;
  END IF;
  IF _valor_total <> (_valor_produtos + _esperado) THEN
    RAISE EXCEPTION 'T1 FALHOU: valor_total=% esperado=%', _valor_total, _valor_produtos + _esperado;
  END IF;
  RAISE NOTICE 'T1 OK · km=% taxa_inicial(descontada)=% → recalculada=% · total=%',
    round(_km::numeric, 3), _taxa_loja_descontada, _taxa, _valor_total;

  -- ===== T2: sem coordenadas → taxa permanece =====
  INSERT INTO public.pedidos (
    loja_id, cliente_nome, cliente_telefone, endereco_entrega,
    valor_produtos, taxa_entrega, valor_total, status
  ) VALUES (
    _loja_id, 'QA TRIGGER T2', '00000000000', 'Sem coords',
    _valor_produtos, _taxa_loja_descontada, _valor_produtos + _taxa_loja_descontada, 'pronto'
  ) RETURNING id INTO _pedido_id;

  UPDATE public.pedidos SET entregador_id = _entregador_id, status='em_rota' WHERE id = _pedido_id;
  SELECT taxa_entrega INTO _taxa FROM public.pedidos WHERE id = _pedido_id;
  DELETE FROM public.pedidos WHERE id = _pedido_id;

  IF _taxa <> _taxa_loja_descontada THEN
    RAISE EXCEPTION 'T2 FALHOU: sem coords não deveria alterar taxa. taxa=%', _taxa;
  END IF;
  RAISE NOTICE 'T2 OK · sem coords mantém taxa original=%', _taxa;

  -- ===== T3: pedido já tinha entregador → trigger NÃO recalcula =====
  INSERT INTO public.pedidos (
    loja_id, cliente_nome, cliente_telefone, endereco_entrega,
    valor_produtos, taxa_entrega, valor_total, status, entregador_id,
    endereco_coleta_lat, endereco_coleta_lng,
    endereco_entrega_lat, endereco_entrega_lng
  ) VALUES (
    _loja_id, 'QA TRIGGER T3', '00000000000', 'Já atribuído',
    _valor_produtos, 99.99, _valor_produtos + 99.99, 'em_rota', _entregador_id,
    -23.5505, -46.6333, -23.5605, -46.6433
  ) RETURNING id INTO _pedido_id;

  UPDATE public.pedidos SET status='coletado' WHERE id = _pedido_id;
  SELECT taxa_entrega INTO _taxa FROM public.pedidos WHERE id = _pedido_id;
  DELETE FROM public.pedidos WHERE id = _pedido_id;

  IF _taxa <> 99.99 THEN
    RAISE EXCEPTION 'T3 FALHOU: trigger disparou em update subsequente. taxa=%', _taxa;
  END IF;
  RAISE NOTICE 'T3 OK · trigger ignora updates após atribuição inicial';

  -- ===== T4: equivalência com aceitar_pedido_externo =====
  INSERT INTO public.pedidos (
    loja_id, cliente_nome, cliente_telefone, endereco_entrega,
    valor_produtos, taxa_entrega, valor_total, status,
    endereco_coleta_lat, endereco_coleta_lng,
    endereco_entrega_lat, endereco_entrega_lng
  ) VALUES (
    _loja_id, 'QA TRIGGER T4', '00000000000', 'Equivalência',
    _valor_produtos, _taxa_loja_descontada, _valor_produtos + _taxa_loja_descontada, 'pronto',
    -23.5505, -46.6333, -23.5805, -46.6633
  ) RETURNING id INTO _pedido_id;

  _km := public.haversine_km(-23.5505, -46.6333, -23.5805, -46.6633);
  _esperado := COALESCE(public.calcular_tarifa_global(_km), _taxa_loja_descontada);

  UPDATE public.pedidos SET entregador_id = _entregador_id, status='em_rota' WHERE id = _pedido_id;
  SELECT taxa_entrega INTO _taxa FROM public.pedidos WHERE id = _pedido_id;
  DELETE FROM public.pedidos WHERE id = _pedido_id;

  IF _taxa <> _esperado THEN
    RAISE EXCEPTION 'T4 FALHOU: trigger=% ≠ lógica do externo=%', _taxa, _esperado;
  END IF;
  RAISE NOTICE 'T4 OK · trigger (próprio)=% == aceitar_pedido_externo=% para km=%',
    _taxa, _esperado, round(_km::numeric, 3);

  RAISE NOTICE '===== TODOS OS 4 TESTES PASSARAM =====';
END $$;
