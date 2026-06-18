
CREATE OR REPLACE FUNCTION public.aplicar_plano_loja()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _p public.planos_loja%ROWTYPE;
BEGIN
  IF NEW.plano_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.plano_id IS NOT DISTINCT FROM OLD.plano_id THEN
    RETURN NEW;
  END IF;
  SELECT * INTO _p FROM public.planos_loja WHERE id = NEW.plano_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  NEW.mensalidade_valor := _p.mensalidade_valor;
  NEW.dia_vencimento_mensalidade := _p.dia_vencimento;
  NEW.plano_mensal_ativo := (_p.taxa_por_pedido = 0);
  -- Plano com mensalidade libera o catálogo automaticamente
  IF _p.mensalidade_valor > 0 THEN
    NEW.catalogo_ativo := true;
  END IF;
  RETURN NEW;
END;
$$;
