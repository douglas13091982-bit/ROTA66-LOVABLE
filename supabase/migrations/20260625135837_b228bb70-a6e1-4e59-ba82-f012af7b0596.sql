
-- 1) Bloquear endereços de coleta sem coordenadas
CREATE OR REPLACE FUNCTION public.validar_endereco_coleta_geocodificado()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.lat IS NULL OR NEW.lng IS NULL THEN
    RAISE EXCEPTION 'Endereço de coleta precisa estar geocodificado (lat/lng obrigatórios). Confira o endereço digitado.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_endereco_coleta_geocodificado ON public.lojas_enderecos_coleta;
CREATE TRIGGER trg_validar_endereco_coleta_geocodificado
BEFORE INSERT OR UPDATE ON public.lojas_enderecos_coleta
FOR EACH ROW EXECUTE FUNCTION public.validar_endereco_coleta_geocodificado();

-- 2) Bloquear criação de pedido sem coordenadas de coleta
CREATE OR REPLACE FUNCTION public.validar_pedido_coords_coleta()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_lat numeric;
  v_lng numeric;
BEGIN
  -- Se já veio com coords, OK
  IF NEW.endereco_coleta_lat IS NOT NULL AND NEW.endereco_coleta_lng IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Tenta preencher a partir do endereço padrão da loja
  SELECT e.lat, e.lng INTO v_lat, v_lng
  FROM public.lojas_enderecos_coleta e
  WHERE e.loja_id = NEW.loja_id AND e.padrao = true
    AND e.lat IS NOT NULL AND e.lng IS NOT NULL
  LIMIT 1;

  IF v_lat IS NULL THEN
    SELECT e.lat, e.lng INTO v_lat, v_lng
    FROM public.lojas_enderecos_coleta e
    WHERE e.loja_id = NEW.loja_id
      AND e.lat IS NOT NULL AND e.lng IS NOT NULL
    ORDER BY e.created_at ASC
    LIMIT 1;
  END IF;

  IF v_lat IS NULL THEN
    RAISE EXCEPTION 'A loja não possui endereço de coleta geocodificado. Cadastre um endereço de coleta válido antes de criar pedidos.'
      USING ERRCODE = 'check_violation';
  END IF;

  NEW.endereco_coleta_lat := v_lat;
  NEW.endereco_coleta_lng := v_lng;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_pedido_coords_coleta ON public.pedidos;
CREATE TRIGGER trg_validar_pedido_coords_coleta
BEFORE INSERT ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION public.validar_pedido_coords_coleta();
