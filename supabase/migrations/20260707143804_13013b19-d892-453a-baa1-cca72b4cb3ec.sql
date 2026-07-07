
CREATE OR REPLACE FUNCTION public.pedido_avulsa_auto_pronto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avulsa boolean;
BEGIN
  SELECT avulsa_plataforma INTO v_avulsa FROM public.lojas WHERE id = NEW.loja_id;
  IF v_avulsa AND NEW.status = 'em_preparo'::public.pedido_status THEN
    NEW.status := 'pronto'::public.pedido_status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pedido_avulsa_auto_pronto ON public.pedidos;
CREATE TRIGGER trg_pedido_avulsa_auto_pronto
  BEFORE INSERT ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.pedido_avulsa_auto_pronto();
