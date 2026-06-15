
-- 1) Tabela de ofertas direcionadas
CREATE TABLE public.pedido_ofertas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL,
  entregador_id uuid NOT NULL,
  ofertado_em timestamptz NOT NULL DEFAULT now(),
  expira_em timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','expirado','recusado','aceito')),
  ciclo integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.pedido_ofertas TO authenticated;
GRANT ALL ON public.pedido_ofertas TO service_role;

ALTER TABLE public.pedido_ofertas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Entregador vê suas ofertas"
  ON public.pedido_ofertas FOR SELECT TO authenticated
  USING (entregador_id = auth.uid());

CREATE POLICY "Super admin vê todas ofertas"
  ON public.pedido_ofertas FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE INDEX idx_pedido_ofertas_ativas
  ON public.pedido_ofertas(pedido_id) WHERE status = 'ativo';
CREATE INDEX idx_pedido_ofertas_entregador
  ON public.pedido_ofertas(entregador_id, status);

-- 2) Função processadora
CREATE OR REPLACE FUNCTION public.processar_ofertas_externas()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pedido record;
  _esc record;
  _ttl_min integer;
  _ciclo integer;
  _ultimo_expirou_em timestamptz;
  _criadas integer := 0;
BEGIN
  -- Marcar ofertas expiradas
  UPDATE public.pedido_ofertas
    SET status = 'expirado'
   WHERE status = 'ativo' AND expira_em < now();

  SELECT entregador_online_ttl_min INTO _ttl_min
    FROM public.config_roteirizacao WHERE singleton = true LIMIT 1;
  _ttl_min := COALESCE(_ttl_min, 10);

  FOR _pedido IN
    SELECT p.*
      FROM public.pedidos p
     WHERE p.status = 'pronto'::pedido_status
       AND p.entregador_id IS NULL
       AND NOT public.loja_tem_entregador_proprio_online(p.loja_id)
       AND NOT EXISTS (
         SELECT 1 FROM public.pedido_ofertas o
          WHERE o.pedido_id = p.id AND o.status = 'ativo'
       )
  LOOP
    SELECT COALESCE(MAX(ciclo), 1) INTO _ciclo
      FROM public.pedido_ofertas WHERE pedido_id = _pedido.id;

    -- Tentar próximo entregador ainda não ofertado neste ciclo
    SELECT s.entregador_id AS entregador_id,
           public.haversine_km(s.lat, s.lng,
             _pedido.endereco_coleta_lat, _pedido.endereco_coleta_lng) AS km
      INTO _esc
      FROM public.entregador_status s
      JOIN public.profiles pr ON pr.id = s.entregador_id
     WHERE s.online = true
       AND s.updated_at > now() - (_ttl_min || ' minutes')::interval
       AND pr.aceita_pedidos_externos = true
       AND public.is_entregador_aprovado(s.entregador_id)
       AND s.lat IS NOT NULL AND s.lng IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM public.pedido_ofertas o2
          WHERE o2.pedido_id = _pedido.id
            AND o2.entregador_id = s.entregador_id
            AND o2.ciclo = _ciclo
       )
       AND NOT EXISTS (
         SELECT 1 FROM public.pedidos pp
          WHERE pp.entregador_id = s.entregador_id
            AND pp.status IN ('em_rota'::pedido_status, 'coletado'::pedido_status)
       )
     ORDER BY km ASC NULLS LAST
     LIMIT 1;

    IF _esc.entregador_id IS NOT NULL THEN
      INSERT INTO public.pedido_ofertas (pedido_id, entregador_id, expira_em, ciclo)
      VALUES (_pedido.id, _esc.entregador_id, now() + interval '130 seconds', _ciclo);
      _criadas := _criadas + 1;
    ELSE
      -- Ninguém novo neste ciclo. Se passou >60s sem oferta ativa, reinicia ciclo.
      SELECT MAX(expira_em) INTO _ultimo_expirou_em
        FROM public.pedido_ofertas
       WHERE pedido_id = _pedido.id AND ciclo = _ciclo;

      IF _ultimo_expirou_em IS NULL OR _ultimo_expirou_em < now() - interval '60 seconds' THEN
        SELECT s.entregador_id AS entregador_id,
               public.haversine_km(s.lat, s.lng,
                 _pedido.endereco_coleta_lat, _pedido.endereco_coleta_lng) AS km
          INTO _esc
          FROM public.entregador_status s
          JOIN public.profiles pr ON pr.id = s.entregador_id
         WHERE s.online = true
           AND s.updated_at > now() - (_ttl_min || ' minutes')::interval
           AND pr.aceita_pedidos_externos = true
           AND public.is_entregador_aprovado(s.entregador_id)
           AND s.lat IS NOT NULL AND s.lng IS NOT NULL
           AND NOT EXISTS (
             SELECT 1 FROM public.pedidos pp
              WHERE pp.entregador_id = s.entregador_id
                AND pp.status IN ('em_rota'::pedido_status, 'coletado'::pedido_status)
           )
         ORDER BY km ASC NULLS LAST
         LIMIT 1;

        IF _esc.entregador_id IS NOT NULL THEN
          INSERT INTO public.pedido_ofertas (pedido_id, entregador_id, expira_em, ciclo)
          VALUES (_pedido.id, _esc.entregador_id, now() + interval '130 seconds', _ciclo + 1);
          _criadas := _criadas + 1;
        END IF;
      END IF;
    END IF;
  END LOOP;

  RETURN _criadas;
END;
$$;

-- 3) Trigger: dispara processamento quando pedido vira pronto
CREATE OR REPLACE FUNCTION public.trigger_processar_ofertas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'pronto'::pedido_status AND NEW.entregador_id IS NULL)
     OR (TG_OP = 'UPDATE'
         AND NEW.status = 'pronto'::pedido_status
         AND NEW.entregador_id IS NULL
         AND (OLD.status IS DISTINCT FROM NEW.status OR OLD.entregador_id IS DISTINCT FROM NEW.entregador_id))
  THEN
    PERFORM public.processar_ofertas_externas();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pedidos_processar_ofertas ON public.pedidos;
CREATE TRIGGER pedidos_processar_ofertas
  AFTER INSERT OR UPDATE OF status, entregador_id ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.trigger_processar_ofertas();

-- 4) Cron a cada 30s (expira ofertas e reatribui)
DO $$
BEGIN
  PERFORM cron.unschedule('processar-ofertas-externas');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'processar-ofertas-externas',
  '30 seconds',
  $$ SELECT public.processar_ofertas_externas(); $$
);

-- 5) Pool externo agora devolve só pedidos com oferta ativa para o usuário,
--    incluindo o horário de expiração.
DROP FUNCTION IF EXISTS public.pedidos_pool_externo();
CREATE OR REPLACE FUNCTION public.pedidos_pool_externo()
RETURNS TABLE (
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
  created_at timestamptz,
  updated_at timestamptz,
  codigo_coleta text,
  codigo_entrega text,
  endereco_coleta text,
  coleta_confirmada_em timestamptz,
  entrega_confirmada_em timestamptz,
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
  eta_chegada_at timestamptz,
  bonus_entregador numeric,
  entrega_paga_em timestamptz,
  entrega_paga boolean,
  oferta_expira_em timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.numero, p.loja_id, p.cliente_user_id, p.cliente_nome, p.cliente_telefone,
         p.endereco_entrega, p.cidade, p.complemento, p.itens, p.valor_produtos, p.taxa_entrega,
         p.valor_total, p.forma_pagamento, p.troco_para, p.status, p.entregador_id, p.observacoes,
         p.created_at, p.updated_at, p.codigo_coleta, p.codigo_entrega, p.endereco_coleta,
         p.coleta_confirmada_em, p.entrega_confirmada_em, p.arquivado, p.rota_id, p.rota_ordem,
         p.atribuido_automaticamente, p.endereco_entrega_lat, p.endereco_coleta_lat,
         p.endereco_entrega_lng, p.endereco_coleta_lng, p.duracao_estimada_seg, p.distancia_metros,
         p.eta_chegada_at, p.bonus_entregador, p.entrega_paga_em, p.entrega_paga,
         o.expira_em AS oferta_expira_em
    FROM public.pedidos p
    JOIN public.pedido_ofertas o ON o.pedido_id = p.id
   WHERE o.entregador_id = auth.uid()
     AND o.status = 'ativo'
     AND o.expira_em > now()
     AND p.status = 'pronto'::pedido_status
     AND p.entregador_id IS NULL
     AND public.is_entregador_aprovado(auth.uid())
     AND EXISTS (
       SELECT 1 FROM public.profiles pr
        WHERE pr.id = auth.uid() AND pr.aceita_pedidos_externos = true
     )
   ORDER BY p.created_at ASC;
$$;

-- 6) aceitar_pedido_externo agora valida oferta ativa e a marca como aceita
CREATE OR REPLACE FUNCTION public.aceitar_pedido_externo(_pedido_id uuid)
RETURNS pedidos
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

  _km := public.haversine_km(
    _p.endereco_coleta_lat, _p.endereco_coleta_lng,
    _p.endereco_entrega_lat, _p.endereco_entrega_lng
  );
  _nova_taxa := COALESCE(public.calcular_tarifa_global(_km), _p.taxa_entrega);

  PERFORM set_config('app.bypass_pedido_guard', 'on', true);

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

  UPDATE public.pedido_ofertas
     SET status = 'aceito'
   WHERE pedido_id = _pedido_id
     AND entregador_id = auth.uid()
     AND status = 'ativo';

  RETURN _p;
END;
$$;
