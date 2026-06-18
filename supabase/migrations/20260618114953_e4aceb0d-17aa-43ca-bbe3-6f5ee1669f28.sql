
ALTER TABLE public.cobrancas_loja
  ADD COLUMN IF NOT EXISTS metodo_pagamento text,
  ADD COLUMN IF NOT EXISTS mp_payment_id text,
  ADD COLUMN IF NOT EXISTS mp_payment_status text,
  ADD COLUMN IF NOT EXISTS mp_qr_code text,
  ADD COLUMN IF NOT EXISTS mp_qr_code_base64 text,
  ADD COLUMN IF NOT EXISTS mp_ticket_url text,
  ADD COLUMN IF NOT EXISTS mp_pix_expira_em timestamptz;

CREATE INDEX IF NOT EXISTS cobrancas_loja_mp_payment_idx
  ON public.cobrancas_loja(mp_payment_id) WHERE mp_payment_id IS NOT NULL;

-- Atualiza guard: ainda impede que loja marque como pago / mude valor,
-- mas permite preencher os campos do MP quando inicia pagamento online.
CREATE OR REPLACE FUNCTION public.cobrancas_loja_update_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RETURN NEW;
  END IF;
  IF public.has_role(_uid, 'super_admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.pago IS DISTINCT FROM OLD.pago
     OR NEW.pago_em IS DISTINCT FROM OLD.pago_em
     OR NEW.valor IS DISTINCT FROM OLD.valor
     OR NEW.vencimento IS DISTINCT FROM OLD.vencimento
     OR NEW.loja_id IS DISTINCT FROM OLD.loja_id
     OR NEW.pedido_id IS DISTINCT FROM OLD.pedido_id THEN
    RAISE EXCEPTION 'Apenas super_admin pode alterar campos de pagamento/identidade da cobrança';
  END IF;

  RETURN NEW;
END;
$function$;
