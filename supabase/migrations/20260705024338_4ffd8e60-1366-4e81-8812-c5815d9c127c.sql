
-- 1) Atualiza o trigger para também copiar a taxa_por_pedido do plano
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
  NEW.taxa_por_pedido := _p.taxa_por_pedido;
  NEW.dia_vencimento_mensalidade := _p.dia_vencimento;
  NEW.plano_mensal_ativo := (_p.taxa_por_pedido = 0);
  RETURN NEW;
END;
$$;

-- 2) Backfill: sincroniza lojas existentes que estão fora de sincronia com o plano
UPDATE public.lojas l
SET
  mensalidade_valor = p.mensalidade_valor,
  taxa_por_pedido = p.taxa_por_pedido,
  dia_vencimento_mensalidade = p.dia_vencimento,
  plano_mensal_ativo = (p.taxa_por_pedido = 0)
FROM public.planos_loja p
WHERE l.plano_id = p.id
  AND (
    l.mensalidade_valor IS DISTINCT FROM p.mensalidade_valor
    OR l.taxa_por_pedido IS DISTINCT FROM p.taxa_por_pedido
  );
