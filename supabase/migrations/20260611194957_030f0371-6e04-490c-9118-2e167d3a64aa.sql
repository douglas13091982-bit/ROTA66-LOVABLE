
-- 1) Novas colunas de vagas
ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS vagas_total integer NOT NULL DEFAULT 1
    CHECK (vagas_total >= 1 AND vagas_total <= 50),
  ADD COLUMN IF NOT EXISTS vagas_preenchidas integer NOT NULL DEFAULT 0
    CHECK (vagas_preenchidas >= 0);

-- 2) Tabela de aceites (múltiplos entregadores por turno)
CREATE TABLE IF NOT EXISTS public.agendamento_aceites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agendamento_id uuid NOT NULL REFERENCES public.agendamentos(id) ON DELETE CASCADE,
  entregador_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  aceito_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agendamento_id, entregador_id)
);
CREATE INDEX IF NOT EXISTS idx_agendamento_aceites_ag ON public.agendamento_aceites(agendamento_id);
CREATE INDEX IF NOT EXISTS idx_agendamento_aceites_ent ON public.agendamento_aceites(entregador_id);

GRANT SELECT ON public.agendamento_aceites TO authenticated;
GRANT ALL ON public.agendamento_aceites TO service_role;

ALTER TABLE public.agendamento_aceites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Entregador vê seus aceites" ON public.agendamento_aceites;
CREATE POLICY "Entregador vê seus aceites"
  ON public.agendamento_aceites FOR SELECT
  USING (auth.uid() = entregador_id);

DROP POLICY IF EXISTS "Loja vê aceites dos seus turnos" ON public.agendamento_aceites;
CREATE POLICY "Loja vê aceites dos seus turnos"
  ON public.agendamento_aceites FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.agendamentos a
    WHERE a.id = agendamento_id
      AND public.is_loja_owner(auth.uid(), a.loja_id)
  ));

ALTER PUBLICATION supabase_realtime ADD TABLE public.agendamento_aceites;

-- 3) Migrar entregadores já aceitos (legado, vagas=1)
INSERT INTO public.agendamento_aceites (agendamento_id, entregador_id, aceito_em)
SELECT id, entregador_id, COALESCE(aceito_em, now())
  FROM public.agendamentos
 WHERE entregador_id IS NOT NULL
ON CONFLICT DO NOTHING;

UPDATE public.agendamentos
   SET vagas_preenchidas = 1
 WHERE entregador_id IS NOT NULL
   AND vagas_preenchidas = 0;

-- 4) aceitar_turno: suporta múltiplas vagas
CREATE OR REPLACE FUNCTION public.aceitar_turno(_agendamento_id uuid)
 RETURNS public.agendamentos
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _a public.agendamentos%ROWTYPE;
  _flag boolean;
  _tem_oferta boolean;
  _ja_aceitou boolean;
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

  SELECT * INTO _a FROM public.agendamentos WHERE id = _agendamento_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Turno não encontrado'; END IF;

  IF _a.status NOT IN ('publicado','aceito') THEN
    RAISE EXCEPTION 'Turno não está disponível';
  END IF;

  IF _a.vagas_preenchidas >= _a.vagas_total THEN
    RAISE EXCEPTION 'Todas as vagas deste turno já foram preenchidas';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.agendamento_aceites
     WHERE agendamento_id = _agendamento_id AND entregador_id = auth.uid()
  ) INTO _ja_aceitou;
  IF _ja_aceitou THEN
    RAISE EXCEPTION 'Você já aceitou este turno';
  END IF;

  INSERT INTO public.agendamento_aceites (agendamento_id, entregador_id)
  VALUES (_agendamento_id, auth.uid());

  UPDATE public.agendamentos
     SET vagas_preenchidas = vagas_preenchidas + 1,
         entregador_id = COALESCE(entregador_id, auth.uid()),
         aceito_em = COALESCE(aceito_em, now()),
         status = CASE
           WHEN vagas_preenchidas + 1 >= vagas_total THEN 'aceito'::agendamento_status
           ELSE 'publicado'::agendamento_status
         END
   WHERE id = _agendamento_id
   RETURNING * INTO _a;

  -- Marca minha oferta como aceita
  UPDATE public.agendamento_ofertas
     SET status = 'aceito'
   WHERE agendamento_id = _agendamento_id
     AND entregador_id = auth.uid()
     AND status = 'ativo';

  -- Se todas as vagas foram preenchidas, expira as ofertas dos outros
  IF _a.vagas_preenchidas >= _a.vagas_total THEN
    UPDATE public.agendamento_ofertas
       SET status = 'expirado'
     WHERE agendamento_id = _agendamento_id
       AND status = 'ativo';
  END IF;

  RETURN _a;
END;
$function$;

-- 5) desmarcar_turno_entregador: decrementa vagas e reabre
CREATE OR REPLACE FUNCTION public.desmarcar_turno_entregador(_agendamento_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _a public.agendamentos%ROWTYPE;
  _inicio timestamptz;
  _removido boolean;
BEGIN
  SELECT * INTO _a FROM public.agendamentos WHERE id = _agendamento_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Turno não encontrado'; END IF;

  IF _a.status NOT IN ('aceito','publicado') THEN
    RAISE EXCEPTION 'Turno não pode ser desmarcado';
  END IF;

  _inicio := (_a.data_turno + _a.hora_inicio) AT TIME ZONE 'America/Sao_Paulo';
  IF _inicio < now() THEN
    RAISE EXCEPTION 'Não é possível desmarcar um turno que já começou';
  END IF;

  DELETE FROM public.agendamento_aceites
   WHERE agendamento_id = _agendamento_id
     AND entregador_id = auth.uid()
  RETURNING true INTO _removido;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Você não está nas vagas deste turno';
  END IF;

  UPDATE public.agendamentos
     SET vagas_preenchidas = GREATEST(0, vagas_preenchidas - 1),
         status = 'publicado'::agendamento_status,
         entregador_id = CASE
           WHEN entregador_id = auth.uid() THEN NULL
           ELSE entregador_id
         END,
         aceito_em = CASE
           WHEN entregador_id = auth.uid() THEN NULL
           ELSE aceito_em
         END
   WHERE id = _agendamento_id;

  -- Reativa a oferta do entregador que saiu
  UPDATE public.agendamento_ofertas
     SET status = 'ativo',
         expira_em = _inicio
   WHERE agendamento_id = _agendamento_id
     AND entregador_id = auth.uid()
     AND status IN ('aceito','expirado');

  -- Garante ofertas para todos os externos aprovados que não tenham
  INSERT INTO public.agendamento_ofertas (agendamento_id, entregador_id, expira_em)
  SELECT _a.id, pr.id, _inicio
    FROM public.profiles pr
   WHERE pr.aceita_pedidos_externos = true
     AND public.is_entregador_aprovado(pr.id)
  ON CONFLICT (agendamento_id, entregador_id) DO UPDATE
    SET status = CASE
      WHEN public.agendamento_ofertas.status = 'expirado' THEN 'ativo'::agendamento_oferta_status
      ELSE public.agendamento_ofertas.status
    END,
    expira_em = EXCLUDED.expira_em;
END;
$function$;

-- 6) cancelar_turno: agora também limpa aceites
CREATE OR REPLACE FUNCTION public.cancelar_turno(_agendamento_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
     AND status IN ('ativo','aceito');
END;
$function$;

-- 7) listar_turnos_disponiveis_entregador: oculta lotados e já aceitos pelo próprio entregador,
--    retorna info de vagas
DROP FUNCTION IF EXISTS public.listar_turnos_disponiveis_entregador();
CREATE OR REPLACE FUNCTION public.listar_turnos_disponiveis_entregador()
 RETURNS TABLE(
   agendamento_id uuid,
   loja_id uuid,
   loja_nome text,
   data_turno date,
   hora_inicio time without time zone,
   duracao_horas numeric,
   valor_por_hora numeric,
   taxa_por_entrega numeric,
   observacoes text,
   expira_em timestamptz,
   vagas_total integer,
   vagas_preenchidas integer
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT a.id, a.loja_id, l.nome,
         a.data_turno, a.hora_inicio, a.duracao_horas,
         a.valor_por_hora, a.taxa_por_entrega,
         a.observacoes, o.expira_em,
         a.vagas_total, a.vagas_preenchidas
    FROM public.agendamento_ofertas o
    JOIN public.agendamentos a ON a.id = o.agendamento_id
    LEFT JOIN public.lojas l ON l.id = a.loja_id
   WHERE o.entregador_id = auth.uid()
     AND o.status = 'ativo'
     AND o.expira_em > now()
     AND a.status IN ('publicado','aceito')
     AND a.vagas_preenchidas < a.vagas_total
     AND NOT EXISTS (
       SELECT 1 FROM public.agendamento_aceites ac
        WHERE ac.agendamento_id = a.id
          AND ac.entregador_id = auth.uid()
     )
   ORDER BY a.data_turno ASC, a.hora_inicio ASC;
$function$;

-- 8) get_entregadores_turnos_loja: agora via tabela de aceites
DROP FUNCTION IF EXISTS public.get_entregadores_turnos_loja(uuid);
CREATE OR REPLACE FUNCTION public.get_entregadores_turnos_loja(_loja_id uuid)
 RETURNS TABLE(agendamento_id uuid, entregador_id uuid, full_name text, avatar_url text, aceito_em timestamptz)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT ac.agendamento_id, p.id, p.full_name, p.avatar_url, ac.aceito_em
    FROM public.agendamento_aceites ac
    JOIN public.agendamentos a ON a.id = ac.agendamento_id
    JOIN public.profiles p ON p.id = ac.entregador_id
   WHERE a.loja_id = _loja_id
     AND public.is_loja_owner(auth.uid(), _loja_id)
   ORDER BY ac.aceito_em ASC;
$function$;

-- 9) Listar "meus turnos" para o entregador (substitui o filtro por entregador_id)
CREATE OR REPLACE FUNCTION public.listar_meus_turnos_entregador()
 RETURNS TABLE(
   id uuid,
   loja_id uuid,
   data_turno date,
   hora_inicio time without time zone,
   duracao_horas numeric,
   valor_por_hora numeric,
   taxa_por_entrega numeric,
   observacoes text,
   status agendamento_status,
   vagas_total integer,
   vagas_preenchidas integer,
   aceito_em timestamptz,
   loja_nome text,
   loja_endereco text,
   loja_endereco_lat numeric,
   loja_endereco_lng numeric,
   loja_telefone text
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT a.id, a.loja_id, a.data_turno, a.hora_inicio, a.duracao_horas,
         a.valor_por_hora, a.taxa_por_entrega, a.observacoes, a.status,
         a.vagas_total, a.vagas_preenchidas, ac.aceito_em,
         l.nome, l.endereco, l.endereco_lat, l.endereco_lng, l.telefone
    FROM public.agendamento_aceites ac
    JOIN public.agendamentos a ON a.id = ac.agendamento_id
    LEFT JOIN public.lojas l ON l.id = a.loja_id
   WHERE ac.entregador_id = auth.uid()
     AND a.status IN ('aceito','publicado','concluido')
   ORDER BY a.data_turno DESC, a.hora_inicio DESC;
$function$;
