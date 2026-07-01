
-- Enum de status
DO $$ BEGIN
  CREATE TYPE public.convite_loja_status AS ENUM ('pendente', 'aceito', 'expirado', 'cancelado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabela
CREATE TABLE IF NOT EXISTS public.revendedor_convites_loja (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  revendedor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email_destinatario text,
  criado_por uuid NOT NULL,
  status public.convite_loja_status NOT NULL DEFAULT 'pendente',
  expira_em timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  aceito_em timestamptz,
  aceito_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_convites_loja_token ON public.revendedor_convites_loja(token);
CREATE INDEX IF NOT EXISTS idx_convites_loja_status ON public.revendedor_convites_loja(status);
CREATE INDEX IF NOT EXISTS idx_convites_loja_revendedor ON public.revendedor_convites_loja(revendedor_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.revendedor_convites_loja TO authenticated;
GRANT ALL ON public.revendedor_convites_loja TO service_role;

ALTER TABLE public.revendedor_convites_loja ENABLE ROW LEVEL SECURITY;

-- Super admin: tudo
CREATE POLICY "super_admin all convites"
  ON public.revendedor_convites_loja FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Revendedor: ver os seus (direcionados ou abertos)
CREATE POLICY "revendedor read own convites"
  ON public.revendedor_convites_loja FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'revendedor')
    AND (revendedor_id = auth.uid() OR revendedor_id IS NULL)
  );

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.tg_convites_loja_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_convites_loja_updated_at ON public.revendedor_convites_loja;
CREATE TRIGGER trg_convites_loja_updated_at
  BEFORE UPDATE ON public.revendedor_convites_loja
  FOR EACH ROW EXECUTE FUNCTION public.tg_convites_loja_updated_at();

-- Função pública: consulta metadados do convite (não expõe dados sensíveis)
CREATE OR REPLACE FUNCTION public.convite_loja_publico(_token uuid)
RETURNS TABLE(
  loja_nome text,
  status public.convite_loja_status,
  expira_em timestamptz,
  email_destinatario text,
  tem_revendedor_alvo boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.nome, c.status, c.expira_em, c.email_destinatario, (c.revendedor_id IS NOT NULL)
  FROM public.revendedor_convites_loja c
  JOIN public.lojas l ON l.id = c.loja_id
  WHERE c.token = _token;
$$;

GRANT EXECUTE ON FUNCTION public.convite_loja_publico(uuid) TO anon, authenticated;

-- Função de aceite
CREATE OR REPLACE FUNCTION public.aceitar_convite_loja(_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_convite public.revendedor_convites_loja%ROWTYPE;
  v_loja_nome text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_role(v_uid, 'revendedor') THEN
    RAISE EXCEPTION 'Apenas revendedores podem aceitar convites' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_convite FROM public.revendedor_convites_loja WHERE token = _token FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Convite não encontrado';
  END IF;

  IF v_convite.status <> 'pendente' THEN
    RAISE EXCEPTION 'Convite não está mais disponível (status: %)', v_convite.status;
  END IF;

  IF v_convite.expira_em < now() THEN
    UPDATE public.revendedor_convites_loja SET status = 'expirado' WHERE id = v_convite.id;
    RAISE EXCEPTION 'Convite expirado';
  END IF;

  IF v_convite.revendedor_id IS NOT NULL AND v_convite.revendedor_id <> v_uid THEN
    RAISE EXCEPTION 'Este convite é destinado a outro revendedor';
  END IF;

  UPDATE public.lojas SET revendedor_id = v_uid WHERE id = v_convite.loja_id
  RETURNING nome INTO v_loja_nome;

  UPDATE public.revendedor_convites_loja
    SET status = 'aceito', aceito_em = now(), aceito_por = v_uid
    WHERE id = v_convite.id;

  RETURN jsonb_build_object('ok', true, 'loja_id', v_convite.loja_id, 'loja_nome', v_loja_nome);
END;
$$;

GRANT EXECUTE ON FUNCTION public.aceitar_convite_loja(uuid) TO authenticated;
