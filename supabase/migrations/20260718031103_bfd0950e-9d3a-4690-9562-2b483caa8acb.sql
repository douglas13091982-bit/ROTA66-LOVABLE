
CREATE TABLE public.entregador_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entregador_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo_veiculo text NOT NULL CHECK (tipo_veiculo IN ('moto','carro','bike_eletrica')),
  cnh_path text,
  placa text,
  veiculo_foto_path text,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','enviado','aprovado','rejeitado')),
  motivo_rejeicao text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_entregador_documentos_status ON public.entregador_documentos(status);
CREATE UNIQUE INDEX idx_entregador_documentos_placa_unica
  ON public.entregador_documentos (upper(placa)) WHERE placa IS NOT NULL;

GRANT SELECT, INSERT, UPDATE ON public.entregador_documentos TO authenticated;
GRANT ALL ON public.entregador_documentos TO service_role;

ALTER TABLE public.entregador_documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "entregador ve seus documentos"
  ON public.entregador_documentos FOR SELECT TO authenticated
  USING (entregador_id = auth.uid());

CREATE POLICY "entregador insere seus documentos"
  ON public.entregador_documentos FOR INSERT TO authenticated
  WITH CHECK (entregador_id = auth.uid());

CREATE POLICY "entregador atualiza seus documentos nao aprovados"
  ON public.entregador_documentos FOR UPDATE TO authenticated
  USING (entregador_id = auth.uid() AND status <> 'aprovado')
  WITH CHECK (
    entregador_id = auth.uid()
    AND status IN ('pendente','enviado')
    AND reviewed_by IS NULL
  );

CREATE POLICY "admin ve documentos"
  ON public.entregador_documentos FOR SELECT TO authenticated
  USING (public.admin_ve_profile(auth.uid(), entregador_id));

CREATE POLICY "admin atualiza documentos"
  ON public.entregador_documentos FOR UPDATE TO authenticated
  USING (public.admin_ve_profile(auth.uid(), entregador_id))
  WITH CHECK (public.admin_ve_profile(auth.uid(), entregador_id));

CREATE OR REPLACE FUNCTION public.validar_placa_veiculo()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.tipo_veiculo IN ('moto','carro') THEN
    IF NEW.status = 'enviado' AND NEW.placa IS NULL THEN
      RAISE EXCEPTION 'Placa é obrigatória para moto/carro';
    END IF;
    IF NEW.placa IS NOT NULL THEN
      NEW.placa := upper(regexp_replace(NEW.placa, '[^A-Za-z0-9]', '', 'g'));
      IF NEW.placa !~ '^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$' THEN
        RAISE EXCEPTION 'Placa inválida. Use formato Mercosul (AAA1A23) ou antigo (AAA1234).';
      END IF;
    END IF;
  END IF;
  NEW.updated_at := now();
  IF TG_OP = 'UPDATE' AND NEW.status IN ('aprovado','rejeitado')
     AND OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.reviewed_at := now();
    NEW.reviewed_by := auth.uid();
    IF NEW.status = 'aprovado' THEN NEW.motivo_rejeicao := NULL; END IF;
  END IF;
  IF NEW.status = 'enviado' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'enviado') THEN
    NEW.submitted_at := now();
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validar_placa_veiculo
  BEFORE INSERT OR UPDATE ON public.entregador_documentos
  FOR EACH ROW EXECUTE FUNCTION public.validar_placa_veiculo();

CREATE OR REPLACE FUNCTION public.criar_documentos_entregador()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tipo text;
BEGIN
  IF NEW.role <> 'entregador' THEN RETURN NEW; END IF;
  SELECT tipo_veiculo INTO v_tipo FROM public.profiles WHERE id = NEW.user_id;
  IF v_tipo IS NULL THEN v_tipo := 'moto'; END IF;
  INSERT INTO public.entregador_documentos (entregador_id, tipo_veiculo, status)
  VALUES (NEW.user_id, v_tipo,
    CASE WHEN v_tipo = 'bike_eletrica' THEN 'aprovado' ELSE 'pendente' END)
  ON CONFLICT (entregador_id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_criar_documentos_entregador
  AFTER INSERT ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.criar_documentos_entregador();

-- Backfill: entregadores existentes ficam aprovados (grandfathering)
INSERT INTO public.entregador_documentos (entregador_id, tipo_veiculo, status)
SELECT ur.user_id, COALESCE(p.tipo_veiculo, 'moto'), 'aprovado'
FROM public.user_roles ur
LEFT JOIN public.profiles p ON p.id = ur.user_id
WHERE ur.role = 'entregador'
ON CONFLICT (entregador_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.sync_tipo_veiculo_documentos()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.tipo_veiculo IS DISTINCT FROM OLD.tipo_veiculo THEN
    UPDATE public.entregador_documentos
    SET tipo_veiculo = NEW.tipo_veiculo,
        status = CASE
          WHEN NEW.tipo_veiculo = 'bike_eletrica' THEN 'aprovado'
          WHEN OLD.tipo_veiculo = 'bike_eletrica' AND NEW.tipo_veiculo IN ('moto','carro') THEN 'pendente'
          ELSE status
        END
    WHERE entregador_id = NEW.id;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_sync_tipo_veiculo_documentos
  AFTER UPDATE OF tipo_veiculo ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_tipo_veiculo_documentos();

CREATE OR REPLACE FUNCTION public.entregador_pode_operar(_entregador_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    COALESCE((SELECT status FROM public.entregador_status_conta WHERE entregador_id = _entregador_id), 'pendente') = 'aprovado'
    AND COALESCE((SELECT status FROM public.entregador_documentos WHERE entregador_id = _entregador_id), 'pendente') = 'aprovado';
$$;

GRANT EXECUTE ON FUNCTION public.entregador_pode_operar(uuid) TO authenticated;

-- Storage policies (bucket já criado)
CREATE POLICY "entregador insere seus arquivos de documento"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'entregador-documentos'
    AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "entregador le seus arquivos de documento"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'entregador-documentos'
    AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "entregador atualiza seus arquivos de documento"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'entregador-documentos'
    AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "admin le arquivos de documento entregador"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'entregador-documentos'
    AND public.admin_ve_profile(auth.uid(), ((storage.foldername(name))[1])::uuid));
