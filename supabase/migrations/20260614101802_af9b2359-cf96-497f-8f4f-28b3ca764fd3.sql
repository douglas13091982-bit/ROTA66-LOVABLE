
-- ============ CONFIG SINGLETON ============
CREATE TABLE public.config_creditos_entregador (
  singleton boolean PRIMARY KEY DEFAULT true,
  ativo boolean NOT NULL DEFAULT false,
  mensalidade_valor numeric(10,2) NOT NULL DEFAULT 0,
  dia_vencimento integer NOT NULL DEFAULT 1 CHECK (dia_vencimento BETWEEN 1 AND 28),
  saldo_minimo numeric(10,2) NOT NULL DEFAULT 0,
  mp_access_token text,
  mp_public_key text,
  valores_recarga_sugeridos numeric(10,2)[] NOT NULL DEFAULT ARRAY[10,25,50,100]::numeric[],
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cce_singleton CHECK (singleton = true)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.config_creditos_entregador TO authenticated;
GRANT ALL ON public.config_creditos_entregador TO service_role;
ALTER TABLE public.config_creditos_entregador ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super_admin manage cce" ON public.config_creditos_entregador
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

INSERT INTO public.config_creditos_entregador (singleton) VALUES (true)
  ON CONFLICT DO NOTHING;

-- ============ SALDO POR ENTREGADOR ============
CREATE TABLE public.entregador_creditos (
  entregador_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  saldo numeric(10,2) NOT NULL DEFAULT 0,
  ultima_competencia_cobrada date,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.entregador_creditos TO authenticated;
GRANT ALL ON public.entregador_creditos TO service_role;
ALTER TABLE public.entregador_creditos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "entregador ve seu saldo" ON public.entregador_creditos
  FOR SELECT TO authenticated
  USING (entregador_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- ============ TRANSAÇÕES ============
CREATE TYPE public.entregador_credito_tipo AS ENUM ('recarga','mensalidade','ajuste_manual','estorno');

CREATE TABLE public.entregador_creditos_transacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entregador_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo public.entregador_credito_tipo NOT NULL,
  valor numeric(10,2) NOT NULL,
  saldo_apos numeric(10,2) NOT NULL,
  descricao text,
  mp_payment_id text,
  competencia date,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);
CREATE INDEX ect_entregador_idx ON public.entregador_creditos_transacoes (entregador_id, created_at DESC);
CREATE UNIQUE INDEX ect_mensalidade_unica
  ON public.entregador_creditos_transacoes (entregador_id, competencia)
  WHERE tipo = 'mensalidade';
GRANT SELECT ON public.entregador_creditos_transacoes TO authenticated;
GRANT ALL ON public.entregador_creditos_transacoes TO service_role;
ALTER TABLE public.entregador_creditos_transacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "entregador ve suas transacoes" ON public.entregador_creditos_transacoes
  FOR SELECT TO authenticated
  USING (entregador_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- ============ RECARGAS MP ============
CREATE TABLE public.entregador_recargas_mp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entregador_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  valor numeric(10,2) NOT NULL CHECK (valor > 0),
  mp_payment_id text UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  qr_code text,
  qr_code_base64 text,
  ticket_url text,
  expira_em timestamptz,
  creditado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX erm_entregador_idx ON public.entregador_recargas_mp (entregador_id, created_at DESC);
GRANT SELECT ON public.entregador_recargas_mp TO authenticated;
GRANT ALL ON public.entregador_recargas_mp TO service_role;
ALTER TABLE public.entregador_recargas_mp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "entregador ve suas recargas" ON public.entregador_recargas_mp
  FOR SELECT TO authenticated
  USING (entregador_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- ============ FUNÇÕES ============

-- Saldo do entregador autenticado
CREATE OR REPLACE FUNCTION public.entregador_saldo_atual()
RETURNS TABLE(saldo numeric, saldo_minimo numeric, ativo boolean, bloqueado boolean, mensalidade_valor numeric, dia_vencimento integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    COALESCE(ec.saldo, 0),
    c.saldo_minimo,
    c.ativo,
    (c.ativo AND COALESCE(ec.saldo, 0) < c.saldo_minimo) AS bloqueado,
    c.mensalidade_valor,
    c.dia_vencimento
  FROM public.config_creditos_entregador c
  LEFT JOIN public.entregador_creditos ec ON ec.entregador_id = auth.uid()
  WHERE c.singleton = true;
$$;

-- Checagem usada pelo processador de ofertas
CREATE OR REPLACE FUNCTION public.entregador_pode_receber_ofertas(_entregador_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.config_creditos_entregador c
    WHERE c.singleton = true
      AND c.ativo = true
      AND COALESCE(
        (SELECT saldo FROM public.entregador_creditos WHERE entregador_id = _entregador_id),
        0
      ) < c.saldo_minimo
  );
$$;

-- Aplica delta no saldo (helper interno)
CREATE OR REPLACE FUNCTION public.aplicar_credito_entregador(
  _entregador_id uuid,
  _delta numeric,
  _tipo public.entregador_credito_tipo,
  _descricao text DEFAULT NULL,
  _mp_payment_id text DEFAULT NULL,
  _competencia date DEFAULT NULL,
  _created_by uuid DEFAULT NULL
) RETURNS numeric
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _novo_saldo numeric;
BEGIN
  INSERT INTO public.entregador_creditos (entregador_id, saldo)
  VALUES (_entregador_id, _delta)
  ON CONFLICT (entregador_id) DO UPDATE
    SET saldo = public.entregador_creditos.saldo + _delta,
        updated_at = now()
  RETURNING saldo INTO _novo_saldo;

  INSERT INTO public.entregador_creditos_transacoes
    (entregador_id, tipo, valor, saldo_apos, descricao, mp_payment_id, competencia, created_by)
  VALUES (_entregador_id, _tipo, _delta, _novo_saldo, _descricao, _mp_payment_id, _competencia, _created_by);

  RETURN _novo_saldo;
END;
$$;

-- Ajuste manual pelo super admin
CREATE OR REPLACE FUNCTION public.super_admin_ajustar_saldo(
  _entregador_id uuid,
  _delta numeric,
  _descricao text
) RETURNS numeric
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  IF _delta = 0 THEN RAISE EXCEPTION 'Valor não pode ser zero'; END IF;
  RETURN public.aplicar_credito_entregador(
    _entregador_id, _delta, 'ajuste_manual', _descricao, NULL, NULL, auth.uid()
  );
END;
$$;

-- Lista entregadores com saldo (super admin)
CREATE OR REPLACE FUNCTION public.super_admin_listar_creditos()
RETURNS TABLE(
  entregador_id uuid, full_name text, phone text,
  saldo numeric, ultima_competencia_cobrada date,
  status_conta text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    p.id, p.full_name, p.phone,
    COALESCE(ec.saldo, 0),
    ec.ultima_competencia_cobrada,
    COALESCE(esc.status::text, 'pendente')
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'entregador'::public.app_role
  LEFT JOIN public.entregador_creditos ec ON ec.entregador_id = p.id
  LEFT JOIN public.entregador_status_conta esc ON esc.entregador_id = p.id
  WHERE public.has_role(auth.uid(), 'super_admin'::public.app_role)
  ORDER BY COALESCE(ec.saldo, 0) ASC, p.full_name ASC;
$$;

-- Job de cobrança de mensalidade (chamado por cron diário)
CREATE OR REPLACE FUNCTION public.cobrar_mensalidades_entregador()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _cfg public.config_creditos_entregador%ROWTYPE;
  _hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  _dia integer := EXTRACT(day FROM _hoje)::integer;
  _competencia date := date_trunc('month', _hoje)::date;
  _ent record;
  _count integer := 0;
BEGIN
  SELECT * INTO _cfg FROM public.config_creditos_entregador WHERE singleton = true;
  IF NOT FOUND OR NOT _cfg.ativo OR _cfg.mensalidade_valor <= 0 THEN
    RETURN 0;
  END IF;
  IF _dia <> _cfg.dia_vencimento THEN
    RETURN 0;
  END IF;

  FOR _ent IN
    SELECT esc.entregador_id
      FROM public.entregador_status_conta esc
     WHERE esc.status = 'aprovado'
       AND NOT EXISTS (
         SELECT 1 FROM public.entregador_creditos_transacoes t
          WHERE t.entregador_id = esc.entregador_id
            AND t.tipo = 'mensalidade'
            AND t.competencia = _competencia
       )
  LOOP
    PERFORM public.aplicar_credito_entregador(
      _ent.entregador_id,
      -_cfg.mensalidade_valor,
      'mensalidade',
      'Mensalidade ' || to_char(_competencia, 'MM/YYYY'),
      NULL,
      _competencia,
      NULL
    );
    UPDATE public.entregador_creditos
       SET ultima_competencia_cobrada = _competencia
     WHERE entregador_id = _ent.entregador_id;
    _count := _count + 1;
  END LOOP;

  RETURN _count;
END;
$$;

-- Config MP do sistema (super admin)
CREATE OR REPLACE FUNCTION public.salvar_config_creditos(
  _ativo boolean,
  _mensalidade numeric,
  _dia integer,
  _saldo_minimo numeric,
  _mp_access_token text,
  _mp_public_key text,
  _valores_sugeridos numeric[]
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  UPDATE public.config_creditos_entregador
     SET ativo = _ativo,
         mensalidade_valor = GREATEST(0, _mensalidade),
         dia_vencimento = LEAST(28, GREATEST(1, _dia)),
         saldo_minimo = _saldo_minimo,
         mp_access_token = NULLIF(trim(_mp_access_token), ''),
         mp_public_key = NULLIF(trim(_mp_public_key), ''),
         valores_recarga_sugeridos = COALESCE(_valores_sugeridos, ARRAY[10,25,50,100]::numeric[]),
         updated_at = now()
   WHERE singleton = true;
END;
$$;

-- Config mascarada para super admin (mostra status sem expor token)
CREATE OR REPLACE FUNCTION public.get_config_creditos_admin()
RETURNS TABLE(
  ativo boolean, mensalidade_valor numeric, dia_vencimento integer,
  saldo_minimo numeric, mp_configurado boolean, mp_public_key text,
  mp_access_token_masked text, valores_recarga_sugeridos numeric[]
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    c.ativo, c.mensalidade_valor, c.dia_vencimento, c.saldo_minimo,
    (c.mp_access_token IS NOT NULL AND length(c.mp_access_token) > 0) AS mp_configurado,
    c.mp_public_key,
    CASE WHEN c.mp_access_token IS NOT NULL AND length(c.mp_access_token) > 8
         THEN repeat('•', 10) || right(c.mp_access_token, 4)
         ELSE NULL END,
    c.valores_recarga_sugeridos
  FROM public.config_creditos_entregador c
  WHERE c.singleton = true
    AND public.has_role(auth.uid(), 'super_admin'::public.app_role);
$$;

-- Config pública para o app do entregador (sem token)
CREATE OR REPLACE FUNCTION public.get_config_creditos_entregador()
RETURNS TABLE(
  ativo boolean, mensalidade_valor numeric, dia_vencimento integer,
  saldo_minimo numeric, mp_configurado boolean,
  valores_recarga_sugeridos numeric[]
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    c.ativo, c.mensalidade_valor, c.dia_vencimento, c.saldo_minimo,
    (c.mp_access_token IS NOT NULL AND length(c.mp_access_token) > 0) AS mp_configurado,
    c.valores_recarga_sugeridos
  FROM public.config_creditos_entregador c
  WHERE c.singleton = true;
$$;

-- ============ AJUSTE EM processar_ofertas_externas ============
CREATE OR REPLACE FUNCTION public.processar_ofertas_externas()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _pedido record;
  _esc record;
  _ttl_min integer;
  _ciclo integer;
  _ultimo_expirou_em timestamptz;
  _criadas integer := 0;
BEGIN
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
       AND public.entregador_pode_receber_ofertas(s.entregador_id)
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
      VALUES (_pedido.id, _esc.entregador_id, now() + interval '999 days', _ciclo);
      _criadas := _criadas + 1;
    ELSE
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
           AND public.entregador_pode_receber_ofertas(s.entregador_id)
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
          VALUES (_pedido.id, _esc.entregador_id, now() + interval '999 days', _ciclo + 1);
          _criadas := _criadas + 1;
        END IF;
      END IF;
    END IF;
  END LOOP;

  RETURN _criadas;
END;
$function$;

-- ============ CRON DIÁRIO ============
SELECT cron.unschedule('cobrar-mensalidades-entregador')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cobrar-mensalidades-entregador');

SELECT cron.schedule(
  'cobrar-mensalidades-entregador',
  '0 6 * * *', -- 06:00 UTC = 03:00 BRT
  $$SELECT public.cobrar_mensalidades_entregador();$$
);
