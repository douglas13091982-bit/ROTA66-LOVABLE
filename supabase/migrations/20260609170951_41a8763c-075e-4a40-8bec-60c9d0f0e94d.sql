
-- Drop old structure (feature is being redone from scratch)
DROP FUNCTION IF EXISTS public.publicar_agendamento(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.aceitar_agendamento(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.listar_agendamentos_loja(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.sync_agendamento_from_pedido() CASCADE;
DROP TABLE IF EXISTS public.agendamentos CASCADE;

-- Status do turno
DO $$ BEGIN
  CREATE TYPE public.agendamento_status AS ENUM ('rascunho','publicado','aceito','concluido','cancelado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.agendamento_oferta_status AS ENUM ('ativo','aceito','expirado','recusado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Nova tabela: turno (shift) que a loja oferece
CREATE TABLE public.agendamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  entregador_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  data_turno date NOT NULL,
  hora_inicio time NOT NULL,
  duracao_horas numeric(4,2) NOT NULL CHECK (duracao_horas > 0 AND duracao_horas <= 24),

  valor_por_hora numeric(10,2) NOT NULL CHECK (valor_por_hora >= 0),
  taxa_por_entrega numeric(10,2) NOT NULL DEFAULT 0 CHECK (taxa_por_entrega >= 0),

  observacoes text,
  status public.agendamento_status NOT NULL DEFAULT 'rascunho',

  publicado_em timestamptz,
  aceito_em timestamptz,
  concluido_em timestamptz,
  cancelado_em timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_agendamentos_loja ON public.agendamentos(loja_id, data_turno DESC);
CREATE INDEX idx_agendamentos_entregador ON public.agendamentos(entregador_id) WHERE entregador_id IS NOT NULL;
CREATE INDEX idx_agendamentos_status ON public.agendamentos(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agendamentos TO authenticated;
GRANT ALL ON public.agendamentos TO service_role;

ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

-- Loja dona: gerencia seus próprios turnos
CREATE POLICY "Loja gerencia seus turnos"
  ON public.agendamentos FOR ALL
  USING (public.is_loja_owner(auth.uid(), loja_id))
  WITH CHECK (public.is_loja_owner(auth.uid(), loja_id));

-- Entregador vê o turno que aceitou
CREATE POLICY "Entregador vê seu turno aceito"
  ON public.agendamentos FOR SELECT
  USING (entregador_id IS NOT NULL AND auth.uid() = entregador_id);

-- Super admin visualiza tudo
CREATE POLICY "Super admin vê todos os turnos"
  ON public.agendamentos FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- Tabela de ofertas (1 por entregador elegível, no momento da publicação)
CREATE TABLE public.agendamento_ofertas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agendamento_id uuid NOT NULL REFERENCES public.agendamentos(id) ON DELETE CASCADE,
  entregador_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.agendamento_oferta_status NOT NULL DEFAULT 'ativo',
  expira_em timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agendamento_id, entregador_id)
);

CREATE INDEX idx_agendamento_ofertas_entregador
  ON public.agendamento_ofertas(entregador_id, status);
CREATE INDEX idx_agendamento_ofertas_ag
  ON public.agendamento_ofertas(agendamento_id, status);

GRANT SELECT, UPDATE ON public.agendamento_ofertas TO authenticated;
GRANT ALL ON public.agendamento_ofertas TO service_role;

ALTER TABLE public.agendamento_ofertas ENABLE ROW LEVEL SECURITY;

-- Entregador só vê as ofertas dele
CREATE POLICY "Entregador vê suas ofertas"
  ON public.agendamento_ofertas FOR SELECT
  USING (auth.uid() = entregador_id);

-- Loja vê as ofertas dos seus agendamentos
CREATE POLICY "Loja vê ofertas dos seus turnos"
  ON public.agendamento_ofertas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.agendamentos a
       WHERE a.id = agendamento_id
         AND public.is_loja_owner(auth.uid(), a.loja_id)
    )
  );

-- Trigger updated_at
CREATE TRIGGER trg_agendamentos_updated_at
  BEFORE UPDATE ON public.agendamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.agendamentos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agendamento_ofertas;
ALTER TABLE public.agendamentos REPLICA IDENTITY FULL;
ALTER TABLE public.agendamento_ofertas REPLICA IDENTITY FULL;

-- ============================================================
-- RPC: publicar turno (loja)
-- ============================================================
CREATE OR REPLACE FUNCTION public.publicar_turno(_agendamento_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _a public.agendamentos%ROWTYPE;
  _loja public.lojas%ROWTYPE;
  _ttl_min integer;
  _criadas integer := 0;
  _inicio timestamptz;
BEGIN
  SELECT * INTO _a FROM public.agendamentos WHERE id = _agendamento_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Turno não encontrado'; END IF;

  IF NOT public.is_loja_owner(auth.uid(), _a.loja_id) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  IF _a.status <> 'rascunho' THEN
    RAISE EXCEPTION 'Turno já foi publicado ou processado';
  END IF;

  SELECT * INTO _loja FROM public.lojas WHERE id = _a.loja_id;
  IF NOT COALESCE(_loja.plano_mensal_ativo, false) THEN
    RAISE EXCEPTION 'Turnos disponíveis apenas para lojas com plano mensal ativo';
  END IF;

  _inicio := (_a.data_turno + _a.hora_inicio) AT TIME ZONE 'America/Sao_Paulo';
  IF _inicio < now() THEN
    RAISE EXCEPTION 'O turno deve começar no futuro';
  END IF;

  SELECT entregador_online_ttl_min INTO _ttl_min
    FROM public.config_roteirizacao WHERE singleton = true LIMIT 1;
  _ttl_min := COALESCE(_ttl_min, 10);

  -- Ofertas simultâneas a TODOS os entregadores externos aprovados
  -- (não exigimos online, para que possam ver mesmo se entrarem mais tarde,
  --  mas damos preferência aos online via campo separado).
  -- Expira ao começar o turno.
  INSERT INTO public.agendamento_ofertas (agendamento_id, entregador_id, expira_em)
  SELECT _a.id, pr.id, _inicio
    FROM public.profiles pr
   WHERE pr.aceita_pedidos_externos = true
     AND public.is_entregador_aprovado(pr.id)
  ON CONFLICT (agendamento_id, entregador_id) DO NOTHING;

  GET DIAGNOSTICS _criadas = ROW_COUNT;

  UPDATE public.agendamentos
     SET status = 'publicado', publicado_em = now()
   WHERE id = _agendamento_id;

  RETURN _criadas;
END;
$$;

-- ============================================================
-- RPC: aceitar turno (entregador) — primeiro a aceitar leva
-- ============================================================
CREATE OR REPLACE FUNCTION public.aceitar_turno(_agendamento_id uuid)
RETURNS public.agendamentos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _a public.agendamentos%ROWTYPE;
  _flag boolean;
  _tem_oferta boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.agendamento_ofertas
     WHERE agendamento_id = _agendamento_id
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

  -- UPDATE atômico: primeiro a aceitar leva
  UPDATE public.agendamentos
     SET entregador_id = auth.uid(),
         status = 'aceito',
         aceito_em = now()
   WHERE id = _agendamento_id
     AND entregador_id IS NULL
     AND status = 'publicado'
   RETURNING * INTO _a;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Turno já foi aceito por outro entregador';
  END IF;

  -- Marca minha oferta como aceita
  UPDATE public.agendamento_ofertas
     SET status = 'aceito'
   WHERE agendamento_id = _agendamento_id
     AND entregador_id = auth.uid()
     AND status = 'ativo';

  -- Expira as demais ofertas
  UPDATE public.agendamento_ofertas
     SET status = 'expirado'
   WHERE agendamento_id = _agendamento_id
     AND entregador_id <> auth.uid()
     AND status = 'ativo';

  RETURN _a;
END;
$$;

-- ============================================================
-- RPC: cancelar turno (loja)
-- ============================================================
CREATE OR REPLACE FUNCTION public.cancelar_turno(_agendamento_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _a public.agendamentos%ROWTYPE;
BEGIN
  SELECT * INTO _a FROM public.agendamentos WHERE id = _agendamento_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Turno não encontrado'; END IF;
  IF NOT public.is_loja_owner(auth.uid(), _a.loja_id) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  IF _a.status IN ('concluido','cancelado') THEN
    RAISE EXCEPTION 'Turno já está finalizado';
  END IF;

  UPDATE public.agendamentos
     SET status = 'cancelado', cancelado_em = now()
   WHERE id = _agendamento_id;

  UPDATE public.agendamento_ofertas
     SET status = 'expirado'
   WHERE agendamento_id = _agendamento_id
     AND status = 'ativo';
END;
$$;

-- ============================================================
-- RPC: concluir turno (loja)
-- ============================================================
CREATE OR REPLACE FUNCTION public.concluir_turno(_agendamento_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _a public.agendamentos%ROWTYPE;
BEGIN
  SELECT * INTO _a FROM public.agendamentos WHERE id = _agendamento_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Turno não encontrado'; END IF;
  IF NOT public.is_loja_owner(auth.uid(), _a.loja_id) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  IF _a.status <> 'aceito' THEN
    RAISE EXCEPTION 'Apenas turnos aceitos podem ser concluídos';
  END IF;

  UPDATE public.agendamentos
     SET status = 'concluido', concluido_em = now()
   WHERE id = _agendamento_id;
END;
$$;

-- ============================================================
-- RPC: listar turnos disponíveis para o entregador
-- ============================================================
CREATE OR REPLACE FUNCTION public.listar_turnos_disponiveis_entregador()
RETURNS TABLE(
  agendamento_id uuid,
  loja_id uuid,
  loja_nome text,
  data_turno date,
  hora_inicio time,
  duracao_horas numeric,
  valor_por_hora numeric,
  taxa_por_entrega numeric,
  observacoes text,
  expira_em timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, a.loja_id, l.nome,
         a.data_turno, a.hora_inicio, a.duracao_horas,
         a.valor_por_hora, a.taxa_por_entrega,
         a.observacoes, o.expira_em
    FROM public.agendamento_ofertas o
    JOIN public.agendamentos a ON a.id = o.agendamento_id
    LEFT JOIN public.lojas l ON l.id = a.loja_id
   WHERE o.entregador_id = auth.uid()
     AND o.status = 'ativo'
     AND o.expira_em > now()
     AND a.status = 'publicado'
     AND a.entregador_id IS NULL
   ORDER BY a.data_turno ASC, a.hora_inicio ASC;
$$;
