
CREATE TABLE public.revendedor_saques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  revendedor_user_id uuid NOT NULL,
  valor numeric NOT NULL CHECK (valor > 0),
  pix_chave text NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  observacoes text,
  observacoes_admin text,
  pago_em timestamptz,
  rejeitado_em timestamptz,
  motivo_rejeicao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.revendedor_saques TO authenticated;
GRANT ALL ON public.revendedor_saques TO service_role;

ALTER TABLE public.revendedor_saques ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Revendedor vê próprios saques"
  ON public.revendedor_saques FOR SELECT
  TO authenticated
  USING (revendedor_user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Revendedor solicita próprio saque"
  ON public.revendedor_saques FOR INSERT
  TO authenticated
  WITH CHECK (revendedor_user_id = auth.uid());

CREATE POLICY "Admin atualiza saques"
  ON public.revendedor_saques FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_revendedor_saques_updated
  BEFORE UPDATE ON public.revendedor_saques
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
