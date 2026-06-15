
CREATE TABLE public.clientes_loja (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL,
  nome text NOT NULL,
  telefone text NOT NULL,
  endereco text,
  complemento text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (loja_id, telefone)
);

CREATE INDEX clientes_loja_loja_idx ON public.clientes_loja(loja_id);
CREATE INDEX clientes_loja_nome_idx ON public.clientes_loja(loja_id, lower(nome));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes_loja TO authenticated;
GRANT ALL ON public.clientes_loja TO service_role;

ALTER TABLE public.clientes_loja ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dono da loja gerencia clientes"
  ON public.clientes_loja FOR ALL
  TO authenticated
  USING (public.is_loja_owner(auth.uid(), loja_id))
  WITH CHECK (public.is_loja_owner(auth.uid(), loja_id));

CREATE TRIGGER clientes_loja_set_updated_at
  BEFORE UPDATE ON public.clientes_loja
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
