
-- Faturas agregadoras MP para taxas por pedido (pagar várias cobrancas_loja num único pagamento)
CREATE TABLE public.cobrancas_faturas_mp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  valor_total numeric(12,2) NOT NULL CHECK (valor_total > 0),
  qtd_cobrancas integer NOT NULL CHECK (qtd_cobrancas > 0),
  metodo_pagamento text,
  mp_payment_id text,
  mp_payment_status text,
  mp_qr_code text,
  mp_qr_code_base64 text,
  mp_ticket_url text,
  mp_pix_expira_em timestamptz,
  pago boolean NOT NULL DEFAULT false,
  pago_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.cobrancas_faturas_mp TO authenticated;
GRANT ALL ON public.cobrancas_faturas_mp TO service_role;

ALTER TABLE public.cobrancas_faturas_mp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Loja vê suas faturas MP"
ON public.cobrancas_faturas_mp FOR SELECT
TO authenticated
USING (
  public.is_loja_owner(auth.uid(), loja_id)
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
);

CREATE TRIGGER update_cobrancas_faturas_mp_updated_at
BEFORE UPDATE ON public.cobrancas_faturas_mp
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Link cada cobrança à fatura agregadora (quando paga em lote via MP)
ALTER TABLE public.cobrancas_loja
  ADD COLUMN IF NOT EXISTS fatura_mp_id uuid REFERENCES public.cobrancas_faturas_mp(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cobrancas_loja_fatura_mp_id
  ON public.cobrancas_loja(fatura_mp_id);
