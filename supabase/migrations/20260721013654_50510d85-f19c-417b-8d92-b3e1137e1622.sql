
-- 1) coluna origem
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS origem TEXT NOT NULL DEFAULT 'proprio';

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pedidos_origem_check'
  ) THEN
    ALTER TABLE public.pedidos
      ADD CONSTRAINT pedidos_origem_check CHECK (origem IN ('proprio','ifood'));
  END IF;
END $$;

-- 2) trigger de geração de códigos: pula quando origem=ifood
CREATE OR REPLACE FUNCTION public.gerar_codigos_pedido()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  _avulsa boolean;
BEGIN
  SELECT COALESCE(avulsa_plataforma, false) INTO _avulsa
    FROM public.lojas WHERE id = NEW.loja_id;

  IF _avulsa OR NEW.origem = 'ifood' THEN
    NEW.codigo_coleta := NULL;
    NEW.codigo_entrega := NULL;
  ELSE
    IF NEW.codigo_coleta IS NULL THEN
      NEW.codigo_coleta := lpad((floor(random()*10000))::int::text, 4, '0');
    END IF;
    IF NEW.codigo_entrega IS NULL THEN
      NEW.codigo_entrega := lpad((floor(random()*10000))::int::text, 4, '0');
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 3) confirmar_entrega: aceita código NULL/qualquer quando origem=ifood
CREATE OR REPLACE FUNCTION public.confirmar_entrega(_pedido_id uuid, _codigo text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _p public.pedidos%ROWTYPE;
BEGIN
  SELECT * INTO _p FROM public.pedidos WHERE id = _pedido_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
  IF NOT (
    public.is_loja_owner(auth.uid(), _p.loja_id)
    OR public.is_loja_funcionario(auth.uid(), _p.loja_id)
    OR (_p.cliente_user_id IS NOT NULL AND auth.uid() = _p.cliente_user_id)
    OR (_p.entregador_id IS NOT NULL AND auth.uid() = _p.entregador_id)
  ) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  IF _p.status <> 'coletado' THEN
    RAISE EXCEPTION 'Pedido ainda não foi coletado';
  END IF;
  -- Pedidos iFood: confirmação acontece no link oficial do iFood, sem código local
  IF _p.origem <> 'ifood' THEN
    IF _p.codigo_entrega IS DISTINCT FROM _codigo THEN
      RAISE EXCEPTION 'Código inválido';
    END IF;
  END IF;
  PERFORM set_config('app.bypass_pedido_guard', 'on', true);
  UPDATE public.pedidos
    SET status = 'entregue', entrega_confirmada_em = now()
    WHERE id = _pedido_id;
  RETURN true;
END;
$function$;
