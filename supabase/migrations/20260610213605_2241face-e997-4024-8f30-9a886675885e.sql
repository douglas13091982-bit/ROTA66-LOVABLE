
-- 1) Guard trigger: somente super_admin pode alterar pago / pago_em / valor / vencimento / loja_id / pedido_id / competencia.
-- Donos da loja podem apenas tocar pago_solicitado_em.

CREATE OR REPLACE FUNCTION public.cobrancas_loja_update_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

DROP TRIGGER IF EXISTS trg_cobrancas_loja_update_guard ON public.cobrancas_loja;
CREATE TRIGGER trg_cobrancas_loja_update_guard
  BEFORE UPDATE ON public.cobrancas_loja
  FOR EACH ROW EXECUTE FUNCTION public.cobrancas_loja_update_guard();

CREATE OR REPLACE FUNCTION public.mensalidades_loja_update_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
     OR NEW.competencia IS DISTINCT FROM OLD.competencia
     OR NEW.loja_id IS DISTINCT FROM OLD.loja_id THEN
    RAISE EXCEPTION 'Apenas super_admin pode alterar campos de pagamento/identidade da mensalidade';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mensalidades_loja_update_guard ON public.mensalidades_loja;
CREATE TRIGGER trg_mensalidades_loja_update_guard
  BEFORE UPDATE ON public.mensalidades_loja
  FOR EACH ROW EXECUTE FUNCTION public.mensalidades_loja_update_guard();

-- 2) Rotacionar push_trigger_secret para invalidar o valor hardcoded em migração antiga.
UPDATE public.private_config
   SET value = encode(extensions.gen_random_bytes(32), 'hex')
 WHERE key = 'push_trigger_secret';
