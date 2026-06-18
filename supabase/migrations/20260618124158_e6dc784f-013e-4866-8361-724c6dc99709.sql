-- ============================================================
-- Enums
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.suporte_ticket_status AS ENUM ('aberto', 'respondido', 'fechado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.suporte_ticket_prioridade AS ENUM ('normal', 'alta');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.suporte_autor_tipo AS ENUM ('loja', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- Tabela suporte_tickets
-- ============================================================
CREATE TABLE IF NOT EXISTS public.suporte_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  assunto text NOT NULL,
  status public.suporte_ticket_status NOT NULL DEFAULT 'aberto',
  prioridade public.suporte_ticket_prioridade NOT NULL DEFAULT 'normal',
  criado_por uuid NOT NULL,
  ultima_mensagem_em timestamptz NOT NULL DEFAULT now(),
  nao_lidas_loja integer NOT NULL DEFAULT 0,
  nao_lidas_admin integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suporte_tickets_loja ON public.suporte_tickets(loja_id, ultima_mensagem_em DESC);
CREATE INDEX IF NOT EXISTS idx_suporte_tickets_status ON public.suporte_tickets(status, ultima_mensagem_em DESC);

GRANT SELECT, INSERT, UPDATE ON public.suporte_tickets TO authenticated;
GRANT ALL ON public.suporte_tickets TO service_role;

ALTER TABLE public.suporte_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Loja vê seus tickets"
  ON public.suporte_tickets FOR SELECT
  TO authenticated
  USING (
    public.is_loja_owner(auth.uid(), loja_id)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

CREATE POLICY "Loja cria seus tickets"
  ON public.suporte_tickets FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_loja_owner(auth.uid(), loja_id) AND criado_por = auth.uid()
  );

CREATE POLICY "Loja e admin atualizam tickets"
  ON public.suporte_tickets FOR UPDATE
  TO authenticated
  USING (
    public.is_loja_owner(auth.uid(), loja_id)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
  WITH CHECK (
    public.is_loja_owner(auth.uid(), loja_id)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

-- ============================================================
-- Tabela suporte_mensagens
-- ============================================================
CREATE TABLE IF NOT EXISTS public.suporte_mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.suporte_tickets(id) ON DELETE CASCADE,
  autor_id uuid NOT NULL,
  autor_tipo public.suporte_autor_tipo NOT NULL,
  mensagem text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suporte_mensagens_ticket ON public.suporte_mensagens(ticket_id, created_at ASC);

GRANT SELECT, INSERT ON public.suporte_mensagens TO authenticated;
GRANT ALL ON public.suporte_mensagens TO service_role;

ALTER TABLE public.suporte_mensagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver mensagens do ticket"
  ON public.suporte_mensagens FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.suporte_tickets t
      WHERE t.id = suporte_mensagens.ticket_id
        AND (
          public.is_loja_owner(auth.uid(), t.loja_id)
          OR public.has_role(auth.uid(), 'admin'::public.app_role)
          OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
        )
    )
  );

CREATE POLICY "Enviar mensagem no ticket"
  ON public.suporte_mensagens FOR INSERT
  TO authenticated
  WITH CHECK (
    autor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.suporte_tickets t
      WHERE t.id = suporte_mensagens.ticket_id
        AND (
          (autor_tipo = 'loja' AND public.is_loja_owner(auth.uid(), t.loja_id))
          OR (autor_tipo = 'admin' AND (
            public.has_role(auth.uid(), 'admin'::public.app_role)
            OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
          ))
        )
    )
  );

-- ============================================================
-- Trigger: ao inserir mensagem, atualizar ticket
-- ============================================================
CREATE OR REPLACE FUNCTION public.suporte_after_message_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.autor_tipo = 'loja' THEN
    UPDATE public.suporte_tickets
       SET ultima_mensagem_em = NEW.created_at,
           updated_at = now(),
           nao_lidas_admin = nao_lidas_admin + 1,
           status = CASE WHEN status = 'fechado' THEN 'aberto' ELSE 'aberto' END
     WHERE id = NEW.ticket_id;
  ELSE
    UPDATE public.suporte_tickets
       SET ultima_mensagem_em = NEW.created_at,
           updated_at = now(),
           nao_lidas_loja = nao_lidas_loja + 1,
           status = 'respondido'
     WHERE id = NEW.ticket_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_suporte_after_message_insert ON public.suporte_mensagens;
CREATE TRIGGER trg_suporte_after_message_insert
AFTER INSERT ON public.suporte_mensagens
FOR EACH ROW EXECUTE FUNCTION public.suporte_after_message_insert();

-- ============================================================
-- Trigger updated_at em tickets
-- ============================================================
DROP TRIGGER IF EXISTS trg_suporte_tickets_updated_at ON public.suporte_tickets;
CREATE TRIGGER trg_suporte_tickets_updated_at
BEFORE UPDATE ON public.suporte_tickets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- RPC: marcar ticket como lido pelo lado correspondente
-- ============================================================
CREATE OR REPLACE FUNCTION public.marcar_ticket_lido(_ticket_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _loja_id uuid;
  _is_admin boolean;
BEGIN
  SELECT loja_id INTO _loja_id FROM public.suporte_tickets WHERE id = _ticket_id;
  IF _loja_id IS NULL THEN
    RAISE EXCEPTION 'Ticket não encontrado';
  END IF;

  _is_admin := public.has_role(auth.uid(), 'admin'::public.app_role)
            OR public.has_role(auth.uid(), 'super_admin'::public.app_role);

  IF _is_admin THEN
    UPDATE public.suporte_tickets SET nao_lidas_admin = 0 WHERE id = _ticket_id;
  ELSIF public.is_loja_owner(auth.uid(), _loja_id) THEN
    UPDATE public.suporte_tickets SET nao_lidas_loja = 0 WHERE id = _ticket_id;
  ELSE
    RAISE EXCEPTION 'Sem permissão';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.marcar_ticket_lido(uuid) TO authenticated;

-- ============================================================
-- RPC: fechar ticket
-- ============================================================
CREATE OR REPLACE FUNCTION public.fechar_ticket_suporte(_ticket_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _loja_id uuid;
BEGIN
  SELECT loja_id INTO _loja_id FROM public.suporte_tickets WHERE id = _ticket_id;
  IF _loja_id IS NULL THEN RAISE EXCEPTION 'Ticket não encontrado'; END IF;

  IF NOT (
    public.is_loja_owner(auth.uid(), _loja_id)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  UPDATE public.suporte_tickets SET status = 'fechado' WHERE id = _ticket_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fechar_ticket_suporte(uuid) TO authenticated;

-- ============================================================
-- RPC para listar tickets do admin com nome da loja (evita join cliente)
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_listar_tickets_suporte()
RETURNS TABLE(
  id uuid,
  loja_id uuid,
  loja_nome text,
  assunto text,
  status public.suporte_ticket_status,
  prioridade public.suporte_ticket_prioridade,
  ultima_mensagem_em timestamptz,
  nao_lidas_admin integer,
  nao_lidas_loja integer,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.loja_id, l.nome, t.assunto, t.status, t.prioridade,
         t.ultima_mensagem_em, t.nao_lidas_admin, t.nao_lidas_loja, t.created_at
    FROM public.suporte_tickets t
    JOIN public.lojas l ON l.id = t.loja_id
   WHERE public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
   ORDER BY t.ultima_mensagem_em DESC;
$$;

GRANT EXECUTE ON FUNCTION public.admin_listar_tickets_suporte() TO authenticated;

-- ============================================================
-- Realtime
-- ============================================================
ALTER TABLE public.suporte_tickets REPLICA IDENTITY FULL;
ALTER TABLE public.suporte_mensagens REPLICA IDENTITY FULL;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.suporte_tickets;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.suporte_mensagens;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;