
CREATE OR REPLACE FUNCTION public.recalcular_taxa_entregador_na_atribuicao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _km numeric;
  _nova_taxa numeric;
BEGIN
  IF NEW.entregador_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF OLD.entregador_id IS NOT NULL THEN
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
  _nova_taxa := public.calcular_tarifa_global(_km);

  IF _nova_taxa IS NULL THEN
    RETURN NEW;
  END IF;

  -- Cartão na entrega: dobra a taxa (entregador precisa retornar à loja
  -- para devolver a maquininha). Cobre o enum legado 'cartao' e os novos
  -- 'cartao_credito' / 'cartao_debito' usados pelo catálogo.
  IF NEW.forma_pagamento IN (
    'cartao'::public.forma_pagamento,
    'cartao_credito'::public.forma_pagamento,
    'cartao_debito'::public.forma_pagamento
  ) THEN
    _nova_taxa := _nova_taxa * 2;
  END IF;

  NEW.taxa_entrega := _nova_taxa;
  NEW.valor_total := COALESCE(NEW.valor_produtos, 0) + _nova_taxa;

  RETURN NEW;
END;
$function$;

-- Atualiza aceitar_pedido_externo aplicando a mesma correção.
-- Recupera o corpo atual da função e substitui só a comparação do cartão.
DO $$
DECLARE
  _def text;
BEGIN
  SELECT pg_get_functiondef(oid) INTO _def
  FROM pg_proc
  WHERE proname = 'aceitar_pedido_externo'
  LIMIT 1;

  IF _def IS NULL THEN
    RAISE NOTICE 'aceitar_pedido_externo não encontrada — pulando';
    RETURN;
  END IF;

  _def := replace(
    _def,
    'IF _p.forma_pagamento = ''cartao''::public.forma_pagamento THEN',
    'IF _p.forma_pagamento IN (''cartao''::public.forma_pagamento, ''cartao_credito''::public.forma_pagamento, ''cartao_debito''::public.forma_pagamento) THEN'
  );

  EXECUTE _def;
END $$;
