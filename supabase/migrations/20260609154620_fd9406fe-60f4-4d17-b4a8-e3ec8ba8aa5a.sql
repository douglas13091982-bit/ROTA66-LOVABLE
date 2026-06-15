
CREATE OR REPLACE FUNCTION public.recalcular_taxa_entregador_na_atribuicao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _km numeric;
  _nova_taxa numeric;
BEGIN
  -- Só recalcula quando o pedido está sendo atribuído (entregador_id passou de NULL para algo)
  IF NEW.entregador_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF OLD.entregador_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Sem coordenadas, não há como recalcular; mantém o valor original
  IF NEW.endereco_coleta_lat IS NULL OR NEW.endereco_coleta_lng IS NULL
     OR NEW.endereco_entrega_lat IS NULL OR NEW.endereco_entrega_lng IS NULL THEN
    RETURN NEW;
  END IF;

  _km := public.haversine_km(
    NEW.endereco_coleta_lat, NEW.endereco_coleta_lng,
    NEW.endereco_entrega_lat, NEW.endereco_entrega_lng
  );
  _nova_taxa := public.calcular_tarifa_global(_km);

  IF _nova_taxa IS NULL THEN
    RETURN NEW;
  END IF;

  NEW.taxa_entrega := _nova_taxa;
  NEW.valor_total := COALESCE(NEW.valor_produtos, 0) + _nova_taxa;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalcular_taxa_entregador_atribuicao ON public.pedidos;
CREATE TRIGGER trg_recalcular_taxa_entregador_atribuicao
BEFORE UPDATE OF entregador_id ON public.pedidos
FOR EACH ROW
EXECUTE FUNCTION public.recalcular_taxa_entregador_na_atribuicao();
