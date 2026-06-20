CREATE OR REPLACE FUNCTION public.notificar_entregador_pedido()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _url text := 'https://rotas66.lovable.app/api/public/send-push';
  _secret text;
  _title text;
  _body text;
  _target_url text;
  _user uuid;
  _rec record;
BEGIN
  SELECT value INTO _secret FROM public.private_config WHERE key = 'push_trigger_secret';
  IF _secret IS NULL THEN RETURN NEW; END IF;

  -- INSERT: novo pedido sem entregador → notifica TODOS os entregadores online
  IF (TG_OP = 'INSERT' AND NEW.entregador_id IS NULL) THEN
    _title := '🚨 Nova entrega disponível';
    _body := 'Pedido #' || NEW.numero || ' — ' || COALESCE(NEW.endereco_entrega, 'toque para ver');
    _target_url := '/entregador/disponiveis';
    FOR _rec IN
      SELECT DISTINCT ps.user_id
      FROM public.push_subscriptions ps
      JOIN public.entregador_status es ON es.entregador_id = ps.user_id
      WHERE es.online = true
    LOOP
      PERFORM net.http_post(
        url := _url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-push-secret', _secret
        ),
        body := jsonb_build_object(
          'user_id', _rec.user_id,
          'title', _title,
          'body', _body,
          'url', _target_url
        )
      );
    END LOOP;
    RETURN NEW;
  END IF;

  -- UPDATE: entregador atribuído
  IF (TG_OP = 'UPDATE' AND OLD.entregador_id IS DISTINCT FROM NEW.entregador_id AND NEW.entregador_id IS NOT NULL) THEN
    _user := NEW.entregador_id;
    _title := 'Nova entrega para você';
    _body := 'Pedido #' || NEW.numero || ' — ' || COALESCE(NEW.endereco_entrega, 'endereço de entrega');
    _target_url := '/entregador/ativos';
  ELSIF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.entregador_id IS NOT NULL) THEN
    _user := NEW.entregador_id;
    _target_url := '/entregador/ativos';
    _title := 'Pedido #' || NEW.numero;
    _body := CASE NEW.status::text
      WHEN 'em_rota' THEN 'Saiu para coleta'
      WHEN 'coletado' THEN 'Coleta confirmada — siga para a entrega'
      WHEN 'entregue' THEN 'Entrega confirmada'
      WHEN 'cancelado' THEN 'Pedido cancelado'
      ELSE 'Status atualizado: ' || NEW.status::text
    END;
  ELSIF (TG_OP = 'UPDATE' AND OLD.entrega_paga IS DISTINCT FROM NEW.entrega_paga AND NEW.entrega_paga = true AND NEW.entregador_id IS NOT NULL) THEN
    _user := NEW.entregador_id;
    _title := 'Pagamento liberado 💸';
    _body := 'Pedido #' || NEW.numero || ' foi marcado como pago pela loja';
    _target_url := '/entregador/historico';
  ELSE
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := _url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-secret', _secret
    ),
    body := jsonb_build_object(
      'user_id', _user,
      'title', _title,
      'body', _body,
      'url', _target_url
    )
  );

  RETURN NEW;
END;
$function$;

-- Recria trigger para também responder a INSERT
DROP TRIGGER IF EXISTS trg_notificar_entregador_pedido ON public.pedidos;
CREATE TRIGGER trg_notificar_entregador_pedido
  AFTER INSERT OR UPDATE ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.notificar_entregador_pedido();