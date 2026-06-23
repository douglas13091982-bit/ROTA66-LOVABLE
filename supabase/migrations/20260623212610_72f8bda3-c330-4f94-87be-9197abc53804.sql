
-- ============================================================
-- 1) Saldo pré-pago da loja
-- ============================================================
CREATE TABLE public.lojas_saldo (
  loja_id uuid PRIMARY KEY REFERENCES public.lojas(id) ON DELETE CASCADE,
  saldo numeric(12,2) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lojas_saldo TO authenticated;
GRANT ALL ON public.lojas_saldo TO service_role;
ALTER TABLE public.lojas_saldo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dono da loja vê seu saldo"
ON public.lojas_saldo FOR SELECT TO authenticated
USING (public.is_loja_owner(auth.uid(), loja_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE TABLE public.lojas_saldo_movimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('recarga','debito_pedido','ajuste_admin','estorno')),
  valor numeric(12,2) NOT NULL,
  saldo_apos numeric(12,2) NOT NULL,
  pedido_id uuid REFERENCES public.pedidos(id) ON DELETE SET NULL,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lojas_saldo_movimentos TO authenticated;
GRANT ALL ON public.lojas_saldo_movimentos TO service_role;
ALTER TABLE public.lojas_saldo_movimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dono da loja vê seus movimentos"
ON public.lojas_saldo_movimentos FOR SELECT TO authenticated
USING (public.is_loja_owner(auth.uid(), loja_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE INDEX idx_lojas_saldo_mov_loja_data ON public.lojas_saldo_movimentos (loja_id, created_at DESC);

-- Recargas da loja via Mercado Pago
CREATE TABLE public.lojas_recargas_mp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  valor numeric(12,2) NOT NULL CHECK (valor > 0),
  mp_payment_id text UNIQUE,
  mp_preference_id text,
  status text NOT NULL DEFAULT 'pendente',
  pix_qrcode text,
  pix_qrcode_base64 text,
  aprovado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lojas_recargas_mp TO authenticated;
GRANT ALL ON public.lojas_recargas_mp TO service_role;
ALTER TABLE public.lojas_recargas_mp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dono da loja vê suas recargas"
ON public.lojas_recargas_mp FOR SELECT TO authenticated
USING (public.is_loja_owner(auth.uid(), loja_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE INDEX idx_lojas_recargas_mp_loja ON public.lojas_recargas_mp (loja_id, created_at DESC);

CREATE TRIGGER trg_lojas_recargas_mp_updated_at
BEFORE UPDATE ON public.lojas_recargas_mp
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 2) Saldo do entregador para saque (separado do saldo de mensalidade)
-- ============================================================
CREATE TABLE public.entregadores_saldo_saque (
  entregador_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  saldo numeric(12,2) NOT NULL DEFAULT 0,
  total_recebido numeric(12,2) NOT NULL DEFAULT 0,
  total_sacado numeric(12,2) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.entregadores_saldo_saque TO authenticated;
GRANT ALL ON public.entregadores_saldo_saque TO service_role;
ALTER TABLE public.entregadores_saldo_saque ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Entregador vê seu próprio saldo de saque"
ON public.entregadores_saldo_saque FOR SELECT TO authenticated
USING (auth.uid() = entregador_id OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE TABLE public.entregadores_saldo_saque_movimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entregador_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('credito_entrega','saque','ajuste_admin','estorno')),
  valor numeric(12,2) NOT NULL,
  saldo_apos numeric(12,2) NOT NULL,
  pedido_id uuid REFERENCES public.pedidos(id) ON DELETE SET NULL,
  saque_id uuid,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.entregadores_saldo_saque_movimentos TO authenticated;
GRANT ALL ON public.entregadores_saldo_saque_movimentos TO service_role;
ALTER TABLE public.entregadores_saldo_saque_movimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Entregador vê seus próprios movimentos"
ON public.entregadores_saldo_saque_movimentos FOR SELECT TO authenticated
USING (auth.uid() = entregador_id OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE INDEX idx_entreg_saldo_saque_mov ON public.entregadores_saldo_saque_movimentos (entregador_id, created_at DESC);

-- ============================================================
-- 3) Saques solicitados pelo entregador
-- ============================================================
CREATE TABLE public.entregador_saques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entregador_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  valor numeric(12,2) NOT NULL CHECK (valor > 0),
  pix_chave text NOT NULL,
  status text NOT NULL DEFAULT 'solicitado' CHECK (status IN ('solicitado','aprovado','pago','rejeitado','cancelado')),
  solicitado_em timestamptz NOT NULL DEFAULT now(),
  pago_em timestamptz,
  rejeitado_em timestamptz,
  motivo_rejeicao text,
  comprovante_url text,
  observacoes_admin text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.entregador_saques TO authenticated;
GRANT ALL ON public.entregador_saques TO service_role;
ALTER TABLE public.entregador_saques ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Entregador vê seus saques"
ON public.entregador_saques FOR SELECT TO authenticated
USING (auth.uid() = entregador_id OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admin atualiza saques"
ON public.entregador_saques FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE INDEX idx_entregador_saques ON public.entregador_saques (entregador_id, created_at DESC);
CREATE INDEX idx_entregador_saques_status ON public.entregador_saques (status, created_at DESC);

CREATE TRIGGER trg_entregador_saques_updated_at
BEFORE UPDATE ON public.entregador_saques
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 4) Configuração de saque (valor mínimo + dia da semana)
-- ============================================================
ALTER TABLE public.config_financeiro
  ADD COLUMN IF NOT EXISTS saque_valor_minimo numeric(12,2) NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS saque_dia_semana smallint NOT NULL DEFAULT 5
    CHECK (saque_dia_semana BETWEEN 0 AND 6); -- 0=domingo, 5=sexta

-- ============================================================
-- 5) Funções de movimento
-- ============================================================
CREATE OR REPLACE FUNCTION public.aplicar_movimento_loja_saldo(
  _loja_id uuid, _delta numeric, _tipo text, _pedido_id uuid, _descricao text
) RETURNS numeric
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _novo numeric;
BEGIN
  INSERT INTO public.lojas_saldo (loja_id, saldo, updated_at)
  VALUES (_loja_id, _delta, now())
  ON CONFLICT (loja_id) DO UPDATE
    SET saldo = lojas_saldo.saldo + _delta,
        updated_at = now()
  RETURNING saldo INTO _novo;

  INSERT INTO public.lojas_saldo_movimentos (loja_id, tipo, valor, saldo_apos, pedido_id, descricao)
  VALUES (_loja_id, _tipo, _delta, _novo, _pedido_id, _descricao);

  RETURN _novo;
END;
$$;

CREATE OR REPLACE FUNCTION public.aplicar_movimento_entregador_saque(
  _entregador_id uuid, _delta numeric, _tipo text, _pedido_id uuid, _saque_id uuid, _descricao text
) RETURNS numeric
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _novo numeric;
BEGIN
  INSERT INTO public.entregadores_saldo_saque (entregador_id, saldo, total_recebido, total_sacado, updated_at)
  VALUES (
    _entregador_id, _delta,
    CASE WHEN _delta > 0 AND _tipo = 'credito_entrega' THEN _delta ELSE 0 END,
    CASE WHEN _delta < 0 AND _tipo = 'saque' THEN -_delta ELSE 0 END,
    now()
  )
  ON CONFLICT (entregador_id) DO UPDATE
    SET saldo = entregadores_saldo_saque.saldo + _delta,
        total_recebido = entregadores_saldo_saque.total_recebido
                       + CASE WHEN _delta > 0 AND _tipo = 'credito_entrega' THEN _delta ELSE 0 END,
        total_sacado = entregadores_saldo_saque.total_sacado
                     + CASE WHEN _delta < 0 AND _tipo = 'saque' THEN -_delta ELSE 0 END,
        updated_at = now()
  RETURNING saldo INTO _novo;

  INSERT INTO public.entregadores_saldo_saque_movimentos
    (entregador_id, tipo, valor, saldo_apos, pedido_id, saque_id, descricao)
  VALUES (_entregador_id, _tipo, _delta, _novo, _pedido_id, _saque_id, _descricao);

  RETURN _novo;
END;
$$;

-- ============================================================
-- 6) Novo trigger de pedido entregue:
--    - credita entregador (sempre)
--    - debita loja (se não tem plano mensal isento)
-- ============================================================
CREATE OR REPLACE FUNCTION public.processar_saldos_pedido_entregue()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _taxa numeric;
  _plano boolean;
BEGIN
  IF NEW.status = 'entregue'::pedido_status
     AND (OLD.status IS DISTINCT FROM NEW.status)
     AND NEW.entregador_id IS NOT NULL THEN

    _taxa := COALESCE(NEW.taxa_entrega, 0);
    IF _taxa <= 0 THEN RETURN NEW; END IF;

    -- Idempotência: se já creditamos esse pedido, sai
    IF EXISTS (
      SELECT 1 FROM public.entregadores_saldo_saque_movimentos
      WHERE pedido_id = NEW.id AND tipo = 'credito_entrega'
    ) THEN
      RETURN NEW;
    END IF;

    -- Credita entregador com a taxa cheia
    PERFORM public.aplicar_movimento_entregador_saque(
      NEW.entregador_id, _taxa, 'credito_entrega', NEW.id, NULL,
      'Entrega pedido #' || NEW.numero
    );

    -- Debita a loja, exceto se tiver plano mensal isento
    SELECT COALESCE(plano_mensal_ativo, false) INTO _plano
      FROM public.lojas WHERE id = NEW.loja_id;

    IF NOT COALESCE(_plano, false) THEN
      PERFORM public.aplicar_movimento_loja_saldo(
        NEW.loja_id, -_taxa, 'debito_pedido', NEW.id,
        'Taxa de entrega pedido #' || NEW.numero
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_processar_saldos_pedido_entregue ON public.pedidos;
CREATE TRIGGER trg_processar_saldos_pedido_entregue
AFTER UPDATE ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION public.processar_saldos_pedido_entregue();

-- Desativa o trigger antigo de cobrança por pedido (substituído pelo saldo)
DROP TRIGGER IF EXISTS trg_gerar_cobranca_pedido_entregue ON public.pedidos;

-- ============================================================
-- 7) Remove regra do x2 para cartão na entrega
-- ============================================================
CREATE OR REPLACE FUNCTION public.recalcular_taxa_entregador_na_atribuicao()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _km numeric;
  _nova_taxa numeric;
BEGIN
  IF NEW.entregador_id IS NULL THEN RETURN NEW; END IF;
  IF OLD.entregador_id IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.endereco_coleta_lat IS NULL OR NEW.endereco_coleta_lng IS NULL
     OR NEW.endereco_entrega_lat IS NULL OR NEW.endereco_entrega_lng IS NULL THEN
    RETURN NEW;
  END IF;

  _km := public.haversine_km(
    NEW.endereco_coleta_lat, NEW.endereco_coleta_lng,
    NEW.endereco_entrega_lat, NEW.endereco_entrega_lng
  );
  _nova_taxa := public.calcular_tarifa_global(_km);
  IF _nova_taxa IS NULL THEN RETURN NEW; END IF;

  NEW.taxa_entrega := _nova_taxa;
  NEW.valor_total := COALESCE(NEW.valor_produtos, 0) + _nova_taxa;
  RETURN NEW;
END;
$$;

-- ============================================================
-- 8) RPCs para uso pelo app
-- ============================================================

-- Super admin recarrega manualmente o saldo da loja (ex: PIX externo)
CREATE OR REPLACE FUNCTION public.loja_recarregar_saldo_manual(
  _loja_id uuid, _valor numeric, _descricao text
) RETURNS numeric
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _novo numeric;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  IF _valor = 0 THEN RAISE EXCEPTION 'Valor não pode ser zero'; END IF;

  _novo := public.aplicar_movimento_loja_saldo(
    _loja_id, _valor,
    CASE WHEN _valor > 0 THEN 'recarga' ELSE 'ajuste_admin' END,
    NULL, COALESCE(_descricao, 'Ajuste manual super admin')
  );
  RETURN _novo;
END;
$$;

-- Entregador consulta saldo + regras de saque
CREATE OR REPLACE FUNCTION public.entregador_saldo_saque_resumo()
RETURNS TABLE(
  saldo numeric, total_recebido numeric, total_sacado numeric,
  valor_minimo numeric, dia_semana_permitido smallint,
  pode_sacar_hoje boolean, tem_saque_pendente boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH cfg AS (
    SELECT saque_valor_minimo AS vmin, saque_dia_semana AS dia
    FROM public.config_financeiro WHERE singleton = true LIMIT 1
  ),
  s AS (
    SELECT COALESCE(saldo,0) AS saldo, COALESCE(total_recebido,0) AS tr, COALESCE(total_sacado,0) AS ts
    FROM public.entregadores_saldo_saque WHERE entregador_id = auth.uid()
  )
  SELECT
    COALESCE((SELECT saldo FROM s), 0),
    COALESCE((SELECT tr FROM s), 0),
    COALESCE((SELECT ts FROM s), 0),
    cfg.vmin,
    cfg.dia,
    (EXTRACT(dow FROM (now() AT TIME ZONE 'America/Sao_Paulo'))::int = cfg.dia
     AND COALESCE((SELECT saldo FROM s), 0) >= cfg.vmin),
    EXISTS (
      SELECT 1 FROM public.entregador_saques
      WHERE entregador_id = auth.uid()
        AND status IN ('solicitado','aprovado')
    )
  FROM cfg;
$$;

-- Entregador solicita saque
CREATE OR REPLACE FUNCTION public.entregador_solicitar_saque(_valor numeric, _pix_chave text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _cfg public.config_financeiro%ROWTYPE;
  _saldo numeric;
  _hoje_dow int;
  _id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF _valor IS NULL OR _valor <= 0 THEN RAISE EXCEPTION 'Valor inválido'; END IF;
  IF _pix_chave IS NULL OR length(trim(_pix_chave)) < 5 THEN
    RAISE EXCEPTION 'Informe uma chave PIX válida';
  END IF;

  SELECT * INTO _cfg FROM public.config_financeiro WHERE singleton = true LIMIT 1;
  IF _cfg IS NULL THEN RAISE EXCEPTION 'Configuração financeira ausente'; END IF;

  IF _valor < _cfg.saque_valor_minimo THEN
    RAISE EXCEPTION 'Valor mínimo de saque: R$ %', _cfg.saque_valor_minimo;
  END IF;

  _hoje_dow := EXTRACT(dow FROM (now() AT TIME ZONE 'America/Sao_Paulo'))::int;
  IF _hoje_dow <> _cfg.saque_dia_semana THEN
    RAISE EXCEPTION 'Saques só podem ser solicitados no dia configurado pela administração';
  END IF;

  SELECT COALESCE(saldo, 0) INTO _saldo
    FROM public.entregadores_saldo_saque WHERE entregador_id = auth.uid();
  IF COALESCE(_saldo, 0) < _valor THEN
    RAISE EXCEPTION 'Saldo insuficiente';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.entregador_saques
    WHERE entregador_id = auth.uid() AND status IN ('solicitado','aprovado')
  ) THEN
    RAISE EXCEPTION 'Você já tem um saque pendente';
  END IF;

  INSERT INTO public.entregador_saques (entregador_id, valor, pix_chave)
  VALUES (auth.uid(), _valor, trim(_pix_chave))
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

-- Super admin marca saque como pago — debita o saldo do entregador
CREATE OR REPLACE FUNCTION public.super_admin_marcar_saque_pago(_saque_id uuid, _comprovante_url text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _s public.entregador_saques%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  SELECT * INTO _s FROM public.entregador_saques WHERE id = _saque_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Saque não encontrado'; END IF;
  IF _s.status = 'pago' THEN RAISE EXCEPTION 'Saque já foi pago'; END IF;
  IF _s.status NOT IN ('solicitado','aprovado') THEN
    RAISE EXCEPTION 'Saque em status inválido para pagamento';
  END IF;

  UPDATE public.entregador_saques
    SET status = 'pago', pago_em = now(), comprovante_url = _comprovante_url
    WHERE id = _saque_id;

  PERFORM public.aplicar_movimento_entregador_saque(
    _s.entregador_id, -_s.valor, 'saque', NULL, _s.id,
    'Saque pago via PIX'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.super_admin_rejeitar_saque(_saque_id uuid, _motivo text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  UPDATE public.entregador_saques
    SET status = 'rejeitado', rejeitado_em = now(), motivo_rejeicao = _motivo
    WHERE id = _saque_id AND status IN ('solicitado','aprovado');
END;
$$;

-- Super admin lista todos os saques
CREATE OR REPLACE FUNCTION public.super_admin_listar_saques()
RETURNS TABLE(
  id uuid, entregador_id uuid, entregador_nome text, entregador_phone text,
  valor numeric, pix_chave text, status text,
  solicitado_em timestamptz, pago_em timestamptz, motivo_rejeicao text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.entregador_id, p.full_name, p.phone,
         s.valor, s.pix_chave, s.status,
         s.solicitado_em, s.pago_em, s.motivo_rejeicao
  FROM public.entregador_saques s
  LEFT JOIN public.profiles p ON p.id = s.entregador_id
  WHERE public.has_role(auth.uid(), 'super_admin'::app_role)
  ORDER BY
    CASE s.status WHEN 'solicitado' THEN 0 WHEN 'aprovado' THEN 1 ELSE 2 END,
    s.created_at DESC;
$$;

-- Super admin lista saldo de todas as lojas
CREATE OR REPLACE FUNCTION public.super_admin_listar_saldos_lojas()
RETURNS TABLE(loja_id uuid, loja_nome text, saldo numeric, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT l.id, l.nome, COALESCE(s.saldo, 0), s.updated_at
  FROM public.lojas l
  LEFT JOIN public.lojas_saldo s ON s.loja_id = l.id
  WHERE public.has_role(auth.uid(), 'super_admin'::app_role)
    AND l.status = 'aprovado'::status_moderacao
  ORDER BY COALESCE(s.saldo, 0) ASC, l.nome ASC;
$$;
