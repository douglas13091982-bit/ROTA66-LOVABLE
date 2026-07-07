
-- 1) Trigger não gera códigos quando o pedido é de uma loja avulsa da plataforma
CREATE OR REPLACE FUNCTION public.gerar_codigos_pedido()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _avulsa boolean;
BEGIN
  SELECT COALESCE(avulsa_plataforma, false) INTO _avulsa
    FROM public.lojas WHERE id = NEW.loja_id;

  IF _avulsa THEN
    -- Pedido avulso: não usa códigos de confirmação
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
$$;

-- 2) confirmar_coleta: quando o pedido é avulso, dispensa o código e permite
--    o próprio entregador designado confirmar (sem passar pelo dono da loja).
CREATE OR REPLACE FUNCTION public.confirmar_coleta(_pedido_id uuid, _codigo text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _p public.pedidos%ROWTYPE;
  _avulsa boolean;
BEGIN
  SELECT * INTO _p FROM public.pedidos WHERE id = _pedido_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;

  SELECT COALESCE(avulsa_plataforma, false) INTO _avulsa
    FROM public.lojas WHERE id = _p.loja_id;

  IF _avulsa THEN
    IF _p.entregador_id IS NULL OR auth.uid() <> _p.entregador_id THEN
      RAISE EXCEPTION 'Sem permissão';
    END IF;
  ELSE
    IF NOT public.is_loja_owner(auth.uid(), _p.loja_id) THEN
      RAISE EXCEPTION 'Sem permissão';
    END IF;
  END IF;

  IF _p.status <> 'em_rota' THEN
    RAISE EXCEPTION 'Pedido não está em rota de coleta';
  END IF;

  -- Só checa código quando o pedido possui código de coleta (não-avulsos).
  IF _p.codigo_coleta IS NOT NULL AND _p.codigo_coleta IS DISTINCT FROM _codigo THEN
    RAISE EXCEPTION 'Código inválido';
  END IF;

  PERFORM set_config('app.bypass_pedido_guard', 'on', true);

  -- Preserva a cascata para rotas agrupadas quando existir código_coleta.
  UPDATE public.pedidos
    SET status = 'coletado',
        coleta_confirmada_em = now()
    WHERE status = 'em_rota'
      AND loja_id = _p.loja_id
      AND (
        (_p.rota_id IS NOT NULL AND rota_id = _p.rota_id)
        OR (
          _p.codigo_coleta IS NOT NULL
          AND codigo_coleta = _p.codigo_coleta
          AND entregador_id IS NOT NULL
          AND entregador_id = _p.entregador_id
        )
        OR id = _pedido_id
      );

  RETURN true;
END;
$function$;

-- 3) confirmar_entrega: dispensa checagem de código quando o pedido é avulso
CREATE OR REPLACE FUNCTION public.confirmar_entrega(_pedido_id uuid, _codigo text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _p public.pedidos%ROWTYPE;
BEGIN
  SELECT * INTO _p FROM public.pedidos WHERE id = _pedido_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;

  IF NOT (
    public.is_loja_owner(auth.uid(), _p.loja_id)
    OR (_p.entregador_id IS NOT NULL AND auth.uid() = _p.entregador_id)
    OR (_p.cliente_user_id IS NOT NULL AND auth.uid() = _p.cliente_user_id)
  ) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  IF _p.status <> 'coletado' THEN
    RAISE EXCEPTION 'Pedido ainda não foi coletado';
  END IF;

  -- Só checa código quando o pedido possui código de entrega (não-avulsos).
  IF _p.codigo_entrega IS NOT NULL AND _p.codigo_entrega IS DISTINCT FROM _codigo THEN
    RAISE EXCEPTION 'Código inválido';
  END IF;

  PERFORM set_config('app.bypass_pedido_guard', 'on', true);
  UPDATE public.pedidos
    SET status = 'entregue', entrega_confirmada_em = now()
    WHERE id = _pedido_id;
  RETURN true;
END;
$function$;
