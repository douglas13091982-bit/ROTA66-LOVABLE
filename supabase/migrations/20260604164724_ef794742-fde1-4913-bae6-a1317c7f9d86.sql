
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS codigo_coleta text,
  ADD COLUMN IF NOT EXISTS codigo_entrega text,
  ADD COLUMN IF NOT EXISTS coleta_confirmada_em timestamptz,
  ADD COLUMN IF NOT EXISTS entrega_confirmada_em timestamptz;

-- Preencher códigos para pedidos existentes
UPDATE public.pedidos
SET codigo_coleta = COALESCE(codigo_coleta, lpad((floor(random()*10000))::int::text, 4, '0')),
    codigo_entrega = COALESCE(codigo_entrega, lpad((floor(random()*10000))::int::text, 4, '0'))
WHERE codigo_coleta IS NULL OR codigo_entrega IS NULL;

-- Trigger de geração
CREATE OR REPLACE FUNCTION public.gerar_codigos_pedido()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.codigo_coleta IS NULL THEN
    NEW.codigo_coleta := lpad((floor(random()*10000))::int::text, 4, '0');
  END IF;
  IF NEW.codigo_entrega IS NULL THEN
    NEW.codigo_entrega := lpad((floor(random()*10000))::int::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gerar_codigos_pedido ON public.pedidos;
CREATE TRIGGER trg_gerar_codigos_pedido
  BEFORE INSERT ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.gerar_codigos_pedido();

-- Confirmar coleta (loja)
CREATE OR REPLACE FUNCTION public.confirmar_coleta(_pedido_id uuid, _codigo text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _p public.pedidos%ROWTYPE;
BEGIN
  SELECT * INTO _p FROM public.pedidos WHERE id = _pedido_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
  IF NOT public.is_loja_owner(auth.uid(), _p.loja_id) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  IF _p.status <> 'em_rota' THEN
    RAISE EXCEPTION 'Pedido não está em rota de coleta';
  END IF;
  IF _p.codigo_coleta IS DISTINCT FROM _codigo THEN
    RAISE EXCEPTION 'Código inválido';
  END IF;
  UPDATE public.pedidos
    SET status = 'coletado', coleta_confirmada_em = now()
    WHERE id = _pedido_id;
  RETURN true;
END;
$$;

-- Confirmar entrega (cliente ou loja)
CREATE OR REPLACE FUNCTION public.confirmar_entrega(_pedido_id uuid, _codigo text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _p public.pedidos%ROWTYPE;
BEGIN
  SELECT * INTO _p FROM public.pedidos WHERE id = _pedido_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
  IF NOT (
    public.is_loja_owner(auth.uid(), _p.loja_id)
    OR (_p.cliente_user_id IS NOT NULL AND auth.uid() = _p.cliente_user_id)
  ) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  IF _p.status <> 'coletado' THEN
    RAISE EXCEPTION 'Pedido ainda não foi coletado';
  END IF;
  IF _p.codigo_entrega IS DISTINCT FROM _codigo THEN
    RAISE EXCEPTION 'Código inválido';
  END IF;
  UPDATE public.pedidos
    SET status = 'entregue', entrega_confirmada_em = now()
    WHERE id = _pedido_id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.confirmar_coleta(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.confirmar_entrega(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirmar_coleta(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirmar_entrega(uuid, text) TO authenticated;
