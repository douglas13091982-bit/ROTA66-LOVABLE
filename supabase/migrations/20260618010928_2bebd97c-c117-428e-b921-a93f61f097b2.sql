
CREATE OR REPLACE FUNCTION public.lojas_update_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RETURN NEW; END IF;
  IF public.has_role(_uid, 'super_admin'::app_role) THEN RETURN NEW; END IF;

  IF NEW.catalogo_ativo IS DISTINCT FROM OLD.catalogo_ativo
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.plano_mensal_ativo IS DISTINCT FROM OLD.plano_mensal_ativo
     OR NEW.mensalidade_valor IS DISTINCT FROM OLD.mensalidade_valor
     OR NEW.dia_vencimento_mensalidade IS DISTINCT FROM OLD.dia_vencimento_mensalidade THEN
    -- Permite quando vier de uma atribuição/troca de plano_id (trigger aplicar_plano_loja)
    IF NEW.plano_id IS DISTINCT FROM OLD.plano_id THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Apenas super_admin pode alterar este campo';
  END IF;

  RETURN NEW;
END;
$function$;
