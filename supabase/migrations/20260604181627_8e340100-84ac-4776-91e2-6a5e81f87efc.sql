
-- 1. Colunas em pedidos
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS rota_id uuid,
  ADD COLUMN IF NOT EXISTS rota_ordem int,
  ADD COLUMN IF NOT EXISTS atribuido_automaticamente boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS endereco_entrega_lat numeric,
  ADD COLUMN IF NOT EXISTS endereco_entrega_lng numeric,
  ADD COLUMN IF NOT EXISTS endereco_coleta_lat numeric,
  ADD COLUMN IF NOT EXISTS endereco_coleta_lng numeric;

CREATE INDEX IF NOT EXISTS idx_pedidos_rota ON public.pedidos(rota_id);

-- 2. entregador_status
CREATE TABLE IF NOT EXISTS public.entregador_status (
  entregador_id uuid PRIMARY KEY,
  online boolean NOT NULL DEFAULT false,
  lat numeric,
  lng numeric,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.entregador_status TO authenticated;
GRANT ALL ON public.entregador_status TO service_role;

ALTER TABLE public.entregador_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Entregador gerencia próprio status"
  ON public.entregador_status FOR ALL TO authenticated
  USING (auth.uid() = entregador_id)
  WITH CHECK (auth.uid() = entregador_id);

CREATE POLICY "Loja vê status dos vinculados"
  ON public.entregador_status FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.loja_entregadores le
    WHERE le.entregador_id = entregador_status.entregador_id
      AND le.ativo = true
      AND public.is_loja_owner(auth.uid(), le.loja_id)
  ));

-- 3. Haversine helper
CREATE OR REPLACE FUNCTION public.haversine_km(lat1 numeric, lng1 numeric, lat2 numeric, lng2 numeric)
RETURNS numeric LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN lat1 IS NULL OR lng1 IS NULL OR lat2 IS NULL OR lng2 IS NULL THEN NULL
    ELSE 6371 * 2 * asin(sqrt(
      power(sin(radians((lat2 - lat1)/2)), 2) +
      cos(radians(lat1)) * cos(radians(lat2)) *
      power(sin(radians((lng2 - lng1)/2)), 2)
    ))
  END;
$$;

-- 4. Auto atribuição
CREATE OR REPLACE FUNCTION public.auto_atribuir_pedido(_pedido_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _p public.pedidos%ROWTYPE;
  _melhor_entregador uuid;
  _rota_existente uuid;
  _proxima_ordem int;
BEGIN
  SELECT * INTO _p FROM public.pedidos WHERE id = _pedido_id;
  IF NOT FOUND OR _p.status <> 'pronto' OR _p.entregador_id IS NOT NULL THEN
    RETURN;
  END IF;

  -- Tenta agrupar: rota ativa do mesmo loja, entregador ainda em coleta/rota,
  -- com pelo menos 1 parada a <2km do destino do pedido novo.
  IF _p.endereco_entrega_lat IS NOT NULL THEN
    SELECT pp.rota_id, pp.entregador_id
      INTO _rota_existente, _melhor_entregador
    FROM public.pedidos pp
    WHERE pp.loja_id = _p.loja_id
      AND pp.rota_id IS NOT NULL
      AND pp.entregador_id IS NOT NULL
      AND pp.status IN ('em_rota', 'coletado')
      AND pp.endereco_entrega_lat IS NOT NULL
      AND public.haversine_km(pp.endereco_entrega_lat, pp.endereco_entrega_lng,
                              _p.endereco_entrega_lat, _p.endereco_entrega_lng) < 2
    ORDER BY pp.created_at DESC
    LIMIT 1;
  END IF;

  -- Senão, escolhe entregador vinculado online com menor carga
  IF _melhor_entregador IS NULL THEN
    SELECT le.entregador_id INTO _melhor_entregador
    FROM public.loja_entregadores le
    LEFT JOIN public.entregador_status es ON es.entregador_id = le.entregador_id
    WHERE le.loja_id = _p.loja_id
      AND le.ativo = true
      AND COALESCE(es.online, false) = true
      AND es.updated_at > now() - interval '10 minutes'
    ORDER BY (
      SELECT count(*) FROM public.pedidos x
      WHERE x.entregador_id = le.entregador_id
        AND x.status IN ('em_rota', 'coletado')
    ) ASC,
    es.updated_at DESC
    LIMIT 1;
  END IF;

  IF _melhor_entregador IS NULL THEN
    RETURN; -- fica em 'pronto' para aceite manual
  END IF;

  IF _rota_existente IS NULL THEN
    _rota_existente := gen_random_uuid();
    _proxima_ordem := 1;
  ELSE
    SELECT COALESCE(max(rota_ordem), 0) + 1 INTO _proxima_ordem
    FROM public.pedidos WHERE rota_id = _rota_existente;
  END IF;

  UPDATE public.pedidos
    SET status = 'em_rota',
        entregador_id = _melhor_entregador,
        rota_id = _rota_existente,
        rota_ordem = _proxima_ordem,
        atribuido_automaticamente = true
    WHERE id = _pedido_id;
END;
$$;

-- 5. Trigger
CREATE OR REPLACE FUNCTION public.trg_auto_atribuir()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'pronto' AND (OLD.status IS DISTINCT FROM 'pronto') AND NEW.entregador_id IS NULL THEN
    PERFORM public.auto_atribuir_pedido(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pedidos_auto_atribuir ON public.pedidos;
CREATE TRIGGER pedidos_auto_atribuir
  AFTER UPDATE OF status ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.trg_auto_atribuir();

-- 6. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.entregador_status;
