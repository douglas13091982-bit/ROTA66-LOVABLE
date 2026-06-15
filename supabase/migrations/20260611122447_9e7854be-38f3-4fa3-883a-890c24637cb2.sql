CREATE OR REPLACE FUNCTION public.processar_ofertas_externas()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _pedido record;
  _esc record;
  _ttl_min integer;
  _ciclo integer;
  _ultimo_expirou_em timestamptz;
  _criadas integer := 0;
BEGIN
  -- Marcar ofertas expiradas
  UPDATE public.pedido_ofertas
    SET status = 'expirado'
   WHERE status = 'ativo' AND expira_em < now();

  SELECT entregador_online_ttl_min INTO _ttl_min
    FROM public.config_roteirizacao WHERE singleton = true LIMIT 1;
  _ttl_min := COALESCE(_ttl_min, 10);

  FOR _pedido IN
    SELECT p.*
      FROM public.pedidos p
     WHERE p.status = 'pronto'::pedido_status
       AND p.entregador_id IS NULL
       AND NOT public.loja_tem_entregador_proprio_online(p.loja_id)
       AND NOT EXISTS (
         SELECT 1 FROM public.pedido_ofertas o
          WHERE o.pedido_id = p.id AND o.status = 'ativo'
       )
  LOOP
    SELECT COALESCE(MAX(ciclo), 1) INTO _ciclo
      FROM public.pedido_ofertas WHERE pedido_id = _pedido.id;

    -- Tentar próximo entregador ainda não ofertado neste ciclo
    SELECT s.entregador_id AS entregador_id,
           public.haversine_km(s.lat, s.lng,
             _pedido.endereco_coleta_lat, _pedido.endereco_coleta_lng) AS km
      INTO _esc
      FROM public.entregador_status s
      JOIN public.profiles pr ON pr.id = s.entregador_id
     WHERE s.online = true
       AND s.updated_at > now() - (_ttl_min || ' minutes')::interval
       AND pr.aceita_pedidos_externos = true
       AND public.is_entregador_aprovado(s.entregador_id)
       AND s.lat IS NOT NULL AND s.lng IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM public.pedido_ofertas o2
          WHERE o2.pedido_id = _pedido.id
            AND o2.entregador_id = s.entregador_id
            AND o2.ciclo = _ciclo
       )
       AND NOT EXISTS (
         SELECT 1 FROM public.pedidos pp
          WHERE pp.entregador_id = s.entregador_id
            AND pp.status IN ('em_rota'::pedido_status, 'coletado'::pedido_status)
       )
     ORDER BY km ASC NULLS LAST
     LIMIT 1;

    IF _esc.entregador_id IS NOT NULL THEN
      INSERT INTO public.pedido_ofertas (pedido_id, entregador_id, expira_em, ciclo)
      VALUES (_pedido.id, _esc.entregador_id, now() + interval '999 days', _ciclo);
      _criadas := _criadas + 1;
    ELSE
      -- Ninguém novo neste ciclo. Se passou >60s sem oferta ativa, reinicia ciclo.
      SELECT MAX(expira_em) INTO _ultimo_expirou_em
        FROM public.pedido_ofertas
       WHERE pedido_id = _pedido.id AND ciclo = _ciclo;

      IF _ultimo_expirou_em IS NULL OR _ultimo_expirou_em < now() - interval '60 seconds' THEN
        SELECT s.entregador_id AS entregador_id,
               public.haversine_km(s.lat, s.lng,
                 _pedido.endereco_coleta_lat, _pedido.endereco_coleta_lng) AS km
          INTO _esc
          FROM public.entregador_status s
          JOIN public.profiles pr ON pr.id = s.entregador_id
         WHERE s.online = true
           AND s.updated_at > now() - (_ttl_min || ' minutes')::interval
           AND pr.aceita_pedidos_externos = true
           AND public.is_entregador_aprovado(s.entregador_id)
           AND s.lat IS NOT NULL AND s.lng IS NOT NULL
           AND NOT EXISTS (
             SELECT 1 FROM public.pedidos pp
              WHERE pp.entregador_id = s.entregador_id
                AND pp.status IN ('em_rota'::pedido_status, 'coletado'::pedido_status)
           )
         ORDER BY km ASC NULLS LAST
         LIMIT 1;

        IF _esc.entregador_id IS NOT NULL THEN
          INSERT INTO public.pedido_ofertas (pedido_id, entregador_id, expira_em, ciclo)
          VALUES (_pedido.id, _esc.entregador_id, now() + interval '999 days', _ciclo + 1);
          _criadas := _criadas + 1;
        END IF;
      END IF;
    END IF;
  END LOOP;

  RETURN _criadas;
END;
$function$;