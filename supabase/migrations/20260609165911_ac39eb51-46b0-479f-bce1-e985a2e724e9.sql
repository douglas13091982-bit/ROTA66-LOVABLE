
-- 1. Tabela agendamentos
CREATE TABLE public.agendamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  entregador_id uuid,
  pedido_id uuid REFERENCES public.pedidos(id) ON DELETE SET NULL,

  -- Cliente / entrega
  cliente_nome text NOT NULL,
  cliente_telefone text NOT NULL,
  endereco_entrega text NOT NULL,
  endereco_entrega_lat numeric,
  endereco_entrega_lng numeric,
  complemento text,
  cidade text,

  -- Coleta
  endereco_coleta text,
  endereco_coleta_lat numeric,
  endereco_coleta_lng numeric,

  -- Pedido
  itens jsonb NOT NULL DEFAULT '[]'::jsonb,
  observacoes text,
  valor_produtos numeric NOT NULL DEFAULT 0,
  taxa_entrega numeric NOT NULL DEFAULT 0,
  valor_total numeric NOT NULL DEFAULT 0,
  forma_pagamento public.forma_pagamento NOT NULL DEFAULT 'dinheiro'::public.forma_pagamento,
  troco_para numeric,

  -- Agendamento
  horario_agendado timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','publicado','aceito','cancelado','entregue')),
  publicado_em timestamptz,
  aceito_em timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_agendamentos_loja ON public.agendamentos(loja_id);
CREATE INDEX idx_agendamentos_entregador ON public.agendamentos(entregador_id);
CREATE INDEX idx_agendamentos_pedido ON public.agendamentos(pedido_id);
CREATE INDEX idx_agendamentos_status ON public.agendamentos(status);
CREATE INDEX idx_agendamentos_horario ON public.agendamentos(horario_agendado);

-- 2. GRANTs
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agendamentos TO authenticated;
GRANT ALL ON public.agendamentos TO service_role;

-- 3. RLS
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

-- Loja: gerencia seus próprios agendamentos
CREATE POLICY "Loja gerencia próprios agendamentos"
  ON public.agendamentos FOR ALL
  TO authenticated
  USING (public.is_loja_owner(auth.uid(), loja_id))
  WITH CHECK (public.is_loja_owner(auth.uid(), loja_id));

-- Entregador: vê agendamentos atribuídos a ele
CREATE POLICY "Entregador vê agendamentos atribuídos"
  ON public.agendamentos FOR SELECT
  TO authenticated
  USING (entregador_id = auth.uid());

-- Super admin: vê tudo
CREATE POLICY "Super admin gerencia agendamentos"
  ON public.agendamentos FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- 4. Trigger updated_at
CREATE TRIGGER agendamentos_set_updated_at
  BEFORE UPDATE ON public.agendamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 5. Função para publicar agendamento (transforma em pedido + ofertas em lote)
CREATE OR REPLACE FUNCTION public.publicar_agendamento(_agendamento_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _a public.agendamentos%ROWTYPE;
  _loja public.lojas%ROWTYPE;
  _pedido_id uuid;
  _ttl_min integer;
  _ofertas_criadas integer := 0;
BEGIN
  -- Carrega e bloqueia o agendamento
  SELECT * INTO _a FROM public.agendamentos WHERE id = _agendamento_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Agendamento não encontrado'; END IF;

  -- Permissão: dono da loja
  IF NOT public.is_loja_owner(auth.uid(), _a.loja_id) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  -- Apenas pendente pode ser publicado
  IF _a.status <> 'pendente' THEN
    RAISE EXCEPTION 'Agendamento já foi publicado ou processado';
  END IF;

  -- Loja precisa ter plano mensal ativo
  SELECT * INTO _loja FROM public.lojas WHERE id = _a.loja_id;
  IF NOT COALESCE(_loja.plano_mensal_ativo, false) THEN
    RAISE EXCEPTION 'Agendamentos disponíveis apenas para lojas com plano mensal ativo';
  END IF;

  -- Cria pedido correspondente
  PERFORM set_config('app.bypass_pedido_guard', 'on', true);

  INSERT INTO public.pedidos (
    loja_id, cliente_nome, cliente_telefone,
    endereco_entrega, endereco_entrega_lat, endereco_entrega_lng,
    complemento, cidade,
    endereco_coleta, endereco_coleta_lat, endereco_coleta_lng,
    itens, observacoes, valor_produtos, taxa_entrega, valor_total,
    forma_pagamento, troco_para,
    status
  ) VALUES (
    _a.loja_id, _a.cliente_nome, _a.cliente_telefone,
    _a.endereco_entrega, _a.endereco_entrega_lat, _a.endereco_entrega_lng,
    _a.complemento, _a.cidade,
    _a.endereco_coleta, _a.endereco_coleta_lat, _a.endereco_coleta_lng,
    _a.itens, _a.observacoes, _a.valor_produtos, _a.taxa_entrega, _a.valor_total,
    _a.forma_pagamento, _a.troco_para,
    'pronto'::pedido_status
  )
  RETURNING id INTO _pedido_id;

  -- TTL para considerar entregador online
  SELECT entregador_online_ttl_min INTO _ttl_min
    FROM public.config_roteirizacao WHERE singleton = true LIMIT 1;
  _ttl_min := COALESCE(_ttl_min, 10);

  -- Cria ofertas SIMULTÂNEAS para TODOS os entregadores externos online elegíveis
  -- Diferente do pool sequencial, aqui todos recebem ao mesmo tempo
  INSERT INTO public.pedido_ofertas (pedido_id, entregador_id, expira_em, ciclo)
  SELECT _pedido_id, s.entregador_id, now() + interval '5 minutes', 1
    FROM public.entregador_status s
    JOIN public.profiles pr ON pr.id = s.entregador_id
   WHERE s.online = true
     AND s.updated_at > now() - (_ttl_min || ' minutes')::interval
     AND pr.aceita_pedidos_externos = true
     AND public.is_entregador_aprovado(s.entregador_id)
     AND NOT EXISTS (
       SELECT 1 FROM public.pedidos pp
        WHERE pp.entregador_id = s.entregador_id
          AND pp.status IN ('em_rota'::pedido_status, 'coletado'::pedido_status)
     );

  GET DIAGNOSTICS _ofertas_criadas = ROW_COUNT;

  -- Atualiza agendamento
  UPDATE public.agendamentos
     SET status = 'publicado',
         pedido_id = _pedido_id,
         publicado_em = now()
   WHERE id = _agendamento_id;

  RETURN _pedido_id;
END;
$$;

-- 6. Função para aceitar agendamento (primeiro que aceita leva)
CREATE OR REPLACE FUNCTION public.aceitar_agendamento(_pedido_id uuid)
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
  _tem_oferta boolean;
BEGIN
  -- Valida oferta ativa para este entregador
  SELECT EXISTS (
    SELECT 1 FROM public.pedido_ofertas
     WHERE pedido_id = _pedido_id
       AND entregador_id = auth.uid()
       AND status = 'ativo'
       AND expira_em > now()
  ) INTO _tem_oferta;
  IF NOT _tem_oferta THEN
    RAISE EXCEPTION 'Esta oferta não está mais ativa para você';
  END IF;

  -- Valida flag de entregador externo
  SELECT aceita_pedidos_externos INTO _flag FROM public.profiles WHERE id = auth.uid();
  IF NOT COALESCE(_flag, false) THEN
    RAISE EXCEPTION 'Você não está habilitado como entregador externo';
  END IF;

  IF NOT public.is_entregador_aprovado(auth.uid()) THEN
    RAISE EXCEPTION 'Sua conta de entregador ainda não foi aprovada';
  END IF;

  -- Bloqueia o pedido
  SELECT * INTO _p FROM public.pedidos WHERE id = _pedido_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
  IF _p.entregador_id IS NOT NULL THEN
    RAISE EXCEPTION 'Agendamento já foi aceito por outro entregador';
  END IF;
  IF _p.status <> 'pronto'::pedido_status THEN
    RAISE EXCEPTION 'Agendamento não está mais disponível';
  END IF;

  -- Recalcula taxa pela tarifa global (mesma lógica de aceitação de externos)
  _km := public.haversine_km(
    _p.endereco_coleta_lat, _p.endereco_coleta_lng,
    _p.endereco_entrega_lat, _p.endereco_entrega_lng
  );
  _nova_taxa := COALESCE(public.calcular_tarifa_global(_km), _p.taxa_entrega);

  PERFORM set_config('app.bypass_pedido_guard', 'on', true);

  -- UPDATE ATÔMICO: primeiro a aceitar leva
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
    RAISE EXCEPTION 'Agendamento não pôde ser aceito (já foi pego)';
  END IF;

  -- Marca oferta deste entregador como aceito
  UPDATE public.pedido_ofertas
     SET status = 'aceito'
   WHERE pedido_id = _pedido_id
     AND entregador_id = auth.uid()
     AND status = 'ativo';

  -- Expira ofertas dos outros entregadores
  UPDATE public.pedido_ofertas
     SET status = 'expirado'
   WHERE pedido_id = _pedido_id
     AND entregador_id <> auth.uid()
     AND status = 'ativo';

  -- Atualiza agendamento
  UPDATE public.agendamentos
     SET status = 'aceito',
         entregador_id = auth.uid(),
         aceito_em = now()
   WHERE pedido_id = _pedido_id;

  RETURN _p;
END;
$$;

-- 7. Listar agendamentos da loja (RLS já cobre, mas RPC facilita filtros)
CREATE OR REPLACE FUNCTION public.listar_agendamentos_loja(_loja_id uuid)
RETURNS SETOF public.agendamentos
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
    FROM public.agendamentos
   WHERE loja_id = _loja_id
     AND public.is_loja_owner(auth.uid(), _loja_id)
   ORDER BY horario_agendado DESC;
$$;

-- 8. Habilita realtime
ALTER TABLE public.agendamentos REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agendamentos;
