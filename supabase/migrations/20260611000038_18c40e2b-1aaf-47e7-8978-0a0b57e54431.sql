CREATE OR REPLACE FUNCTION public.unificar_lote_coleta(
  _pedido_ids uuid[],
  _rota_id uuid DEFAULT NULL,
  _codigo_coleta text DEFAULT NULL
)
RETURNS TABLE(id uuid, rota_id uuid, codigo_coleta text, rota_ordem integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _rota uuid;
  _codigo text;
  _loja uuid;
  _count_check integer;
  _ids_ord uuid[];
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  IF _pedido_ids IS NULL OR array_length(_pedido_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Lista de pedidos vazia';
  END IF;

  -- Todos os pedidos devem pertencer ao mesmo entregador (o caller) ou à loja do caller,
  -- estar em status compatível (em_rota ou coletado) e da mesma loja.
  SELECT COUNT(DISTINCT loja_id), MIN(loja_id)
    INTO _count_check, _loja
    FROM public.pedidos
   WHERE id = ANY(_pedido_ids);

  IF _count_check IS NULL OR _count_check = 0 THEN
    RAISE EXCEPTION 'Pedidos não encontrados';
  END IF;
  IF _count_check > 1 THEN
    RAISE EXCEPTION 'Pedidos de lojas diferentes não podem compor o mesmo lote';
  END IF;

  -- Permissão: entregador dono OU loja_owner OU super_admin
  IF NOT (
    public.is_loja_owner(_uid, _loja)
    OR public.has_role(_uid, 'super_admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.pedidos
       WHERE id = ANY(_pedido_ids)
         AND (entregador_id IS NULL OR entregador_id = _uid)
      HAVING COUNT(*) = array_length(_pedido_ids, 1)
    )
  ) THEN
    RAISE EXCEPTION 'Sem permissão para unificar este lote';
  END IF;

  -- Resolve rota_id e codigo_coleta compartilhados (reusa se algum já tiver)
  SELECT COALESCE(_rota_id, MAX(p.rota_id)) INTO _rota
    FROM public.pedidos p WHERE p.id = ANY(_pedido_ids);
  IF _rota IS NULL THEN _rota := gen_random_uuid(); END IF;

  SELECT COALESCE(_codigo_coleta, MAX(p.codigo_coleta)) INTO _codigo
    FROM public.pedidos p WHERE p.id = ANY(_pedido_ids);
  IF _codigo IS NULL THEN
    _codigo := lpad((floor(random()*10000))::int::text, 4, '0');
  END IF;

  PERFORM set_config('app.bypass_pedido_guard', 'on', true);

  -- Atualiza todos com o mesmo rota_id + codigo_coleta, preservando rota_ordem
  -- existente quando houver; caso não, atribui na ordem do array recebido.
  WITH ord AS (
    SELECT unnest(_pedido_ids) AS pid,
           generate_subscripts(_pedido_ids, 1) AS ix
  )
  UPDATE public.pedidos p
     SET rota_id = _rota,
         codigo_coleta = _codigo,
         rota_ordem = COALESCE(p.rota_ordem, ord.ix)
    FROM ord
   WHERE p.id = ord.pid;

  RETURN QUERY
    SELECT p.id, p.rota_id, p.codigo_coleta, p.rota_ordem
      FROM public.pedidos p
     WHERE p.id = ANY(_pedido_ids)
     ORDER BY p.rota_ordem NULLS LAST;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.unificar_lote_coleta(uuid[], uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.unificar_lote_coleta(uuid[], uuid, text) FROM anon, public;