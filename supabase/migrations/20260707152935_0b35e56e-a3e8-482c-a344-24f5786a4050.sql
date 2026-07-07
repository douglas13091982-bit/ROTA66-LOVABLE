
CREATE OR REPLACE FUNCTION public.recalcular_taxa_entregador_na_atribuicao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _km numeric;
  _frete numeric;
  _taxa_plano numeric;
  _nova_taxa numeric;
  _avulsa boolean;
BEGIN
  IF NEW.entregador_id IS NULL THEN RETURN NEW; END IF;
  IF OLD.entregador_id IS NOT NULL THEN RETURN NEW; END IF;

  -- Pedido avulso da plataforma: o valor foi calculado pela rota real
  -- (Google Routes) e cobrado do cliente. NÃO recalcular.
  SELECT COALESCE(avulsa_plataforma, false) INTO _avulsa
    FROM public.lojas WHERE id = NEW.loja_id;
  IF _avulsa THEN
    RETURN NEW;
  END IF;

  IF NEW.endereco_coleta_lat IS NULL OR NEW.endereco_coleta_lng IS NULL
     OR NEW.endereco_entrega_lat IS NULL OR NEW.endereco_entrega_lng IS NULL THEN
    RETURN NEW;
  END IF;

  _km := public.haversine_km(
    NEW.endereco_coleta_lat, NEW.endereco_coleta_lng,
    NEW.endereco_entrega_lat, NEW.endereco_entrega_lng
  );
  _frete := public.calcular_tarifa_global(_km);
  IF _frete IS NULL THEN RETURN NEW; END IF;

  _taxa_plano := COALESCE(NEW.taxa_por_pedido_aplicada, 0);
  _nova_taxa := _frete + _taxa_plano;

  NEW.taxa_entrega := _nova_taxa;
  NEW.valor_total := COALESCE(NEW.valor_produtos, 0) + _nova_taxa;
  RETURN NEW;
END;
$function$;
