-- Fecha vazamentos de entregadores para franqueados: toda leitura/ação de super_admin
-- precisa respeitar o city_id autorizado do franqueado.

CREATE OR REPLACE FUNCTION public.entregadores_online_admin()
RETURNS TABLE(
  entregador_id uuid,
  full_name text,
  phone text,
  lat numeric,
  lng numeric,
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.entregador_id, p.full_name, p.phone, s.lat, s.lng, s.updated_at
  FROM public.entregador_status s
  LEFT JOIN public.profiles p ON p.id = s.entregador_id
  WHERE public.admin_ve_profile(auth.uid(), s.entregador_id)
    AND s.online = true
    AND s.lat IS NOT NULL
    AND s.lng IS NOT NULL
    AND s.updated_at > now() - (
      COALESCE((SELECT entregador_online_ttl_min FROM public.config_roteirizacao WHERE singleton = true LIMIT 1), 10)
      || ' minutes'
    )::interval;
$$;

DROP POLICY IF EXISTS "Super admin gerencia vínculos" ON public.loja_entregadores;
CREATE POLICY "Super admin gerencia vínculos"
ON public.loja_entregadores FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  AND public.admin_ve_loja(auth.uid(), loja_entregadores.loja_id)
  AND public.admin_ve_profile(auth.uid(), loja_entregadores.entregador_id)
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  AND public.admin_ve_loja(auth.uid(), loja_entregadores.loja_id)
  AND public.admin_ve_profile(auth.uid(), loja_entregadores.entregador_id)
);

CREATE OR REPLACE FUNCTION public.super_admin_listar_creditos()
RETURNS TABLE(
  entregador_id uuid,
  full_name text,
  phone text,
  saldo numeric,
  ultima_competencia_cobrada date,
  status_conta text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.full_name,
    p.phone,
    COALESCE(ec.saldo, 0),
    ec.ultima_competencia_cobrada,
    COALESCE(esc.status::text, 'pendente')
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'entregador'::public.app_role
  LEFT JOIN public.entregador_creditos ec ON ec.entregador_id = p.id
  LEFT JOIN public.entregador_status_conta esc ON esc.entregador_id = p.id
  WHERE public.admin_ve_profile(auth.uid(), p.id)
  ORDER BY COALESCE(ec.saldo, 0) ASC, p.full_name ASC;
$$;

CREATE OR REPLACE FUNCTION public.super_admin_listar_saques()
RETURNS TABLE(
  id uuid,
  entregador_id uuid,
  entregador_nome text,
  entregador_phone text,
  valor numeric,
  pix_chave text,
  status text,
  solicitado_em timestamp with time zone,
  pago_em timestamp with time zone,
  motivo_rejeicao text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.entregador_id, p.full_name, p.phone,
         s.valor, s.pix_chave, s.status,
         s.solicitado_em, s.pago_em, s.motivo_rejeicao
  FROM public.entregador_saques s
  LEFT JOIN public.profiles p ON p.id = s.entregador_id
  WHERE public.admin_ve_profile(auth.uid(), s.entregador_id)
  ORDER BY
    CASE s.status WHEN 'solicitado' THEN 0 WHEN 'aprovado' THEN 1 ELSE 2 END,
    s.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.super_admin_ajustar_saldo(_entregador_id uuid, _delta numeric, _descricao text)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.admin_ve_profile(auth.uid(), _entregador_id) THEN
    RAISE EXCEPTION 'Sem permissão para este entregador';
  END IF;

  IF _delta = 0 THEN
    RAISE EXCEPTION 'Valor não pode ser zero';
  END IF;

  RETURN public.aplicar_credito_entregador(
    _entregador_id, _delta, 'ajuste_manual', _descricao, NULL, NULL, auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.super_admin_marcar_saque_pago(_saque_id uuid, _comprovante_url text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _s public.entregador_saques%ROWTYPE;
BEGIN
  SELECT * INTO _s FROM public.entregador_saques WHERE id = _saque_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Saque não encontrado';
  END IF;

  IF NOT public.admin_ve_profile(auth.uid(), _s.entregador_id) THEN
    RAISE EXCEPTION 'Sem permissão para este entregador';
  END IF;

  IF _s.status = 'pago' THEN
    RAISE EXCEPTION 'Saque já foi pago';
  END IF;
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _s public.entregador_saques%ROWTYPE;
BEGIN
  SELECT * INTO _s FROM public.entregador_saques WHERE id = _saque_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Saque não encontrado';
  END IF;

  IF NOT public.admin_ve_profile(auth.uid(), _s.entregador_id) THEN
    RAISE EXCEPTION 'Sem permissão para este entregador';
  END IF;

  UPDATE public.entregador_saques
     SET status = 'rejeitado', rejeitado_em = now(), motivo_rejeicao = _motivo
   WHERE id = _saque_id AND status IN ('solicitado','aprovado');
END;
$$;
