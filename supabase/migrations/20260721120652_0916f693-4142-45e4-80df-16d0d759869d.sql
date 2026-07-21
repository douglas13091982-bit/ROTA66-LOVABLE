CREATE OR REPLACE FUNCTION public.notificar_entregador_pedido()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _url text := 'https://rotas66.lovable.app/api/public/send-push';
  _secret text;
  _title text;
  _body text;
  _target_url text;
  _tag text;
  _user uuid;
  _rec record;
  _loja_nome text;
  _valor_entregador numeric;
  _valor_txt text;
BEGIN
  SELECT value INTO _secret FROM public.private_config WHERE key = 'push_trigger_secret';
  IF _secret IS NULL THEN RETURN NEW; END IF;

  -- Nome da loja (usado nas notificações)
  SELECT nome INTO _loja_nome FROM public.lojas WHERE id = NEW.loja_id;
  _loja_nome := COALESCE(NULLIF(_loja_nome, ''), 'Loja');

  -- Valor que o entregador vai receber = taxa_entrega paga pelo cliente
  -- menos a taxa por pedido retida pela loja + bônus opcional.
  _valor_entregador := COALESCE(NEW.taxa_entrega, 0)
                     - COALESCE(NEW.taxa_por_pedido_aplicada, 0)
                     + COALESCE(NEW.bonus_entregador, 0);
  IF _valor_entregador < 0 THEN _valor_entregador := 0; END IF;
  _valor_txt := 'R$ ' || replace(to_char(_valor_entregador, 'FM999990.00'), '.', ',');

  -- Pedido nasceu PRONTO ou ficou PRONTO e ainda sem entregador → notifica entregadores online
  IF ((TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status))
      AND NEW.status::text = 'pronto'
      AND NEW.entregador_id IS NULL) THEN
    _title := '🚨 Nova entrega — ' || _valor_txt;
    _body := _loja_nome || ' • Toque para aceitar';
    _target_url := '/entregador/disponiveis';
    _tag := 'rota66-pedido-' || NEW.id::text;

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
          'url', _target_url,
          'tag', _tag
        )
      );
    END LOOP;
    RETURN NEW;
  END IF;

  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  -- Entregador atribuído
  IF (OLD.entregador_id IS DISTINCT FROM NEW.entregador_id AND NEW.entregador_id IS NOT NULL) THEN
    _user := NEW.entregador_id;
    _title := 'Nova entrega — ' || _valor_txt;
    _body := _loja_nome;
    _target_url := '/entregador/ativos';
    _tag := 'rota66-pedido-atribuido-' || NEW.id::text;
  ELSIF (OLD.status IS DISTINCT FROM NEW.status AND NEW.entregador_id IS NOT NULL) THEN
    _user := NEW.entregador_id;
    _target_url := '/entregador/ativos';
    _tag := 'rota66-pedido-status-' || NEW.id::text || '-' || NEW.status::text;
    _title := 'Pedido #' || NEW.numero;
    _body := CASE NEW.status::text
      WHEN 'em_rota' THEN 'Saiu para coleta'
      WHEN 'coletado' THEN 'Coleta confirmada — siga para a entrega'
      WHEN 'entregue' THEN 'Entrega confirmada'
      WHEN 'cancelado' THEN 'Pedido cancelado'
      ELSE 'Status atualizado: ' || NEW.status::text
    END;
  ELSIF (OLD.entrega_paga IS DISTINCT FROM NEW.entrega_paga AND NEW.entrega_paga = true AND NEW.entregador_id IS NOT NULL) THEN
    _user := NEW.entregador_id;
    _title := 'Pagamento liberado 💸';
    _body := 'Pedido #' || NEW.numero || ' foi marcado como pago pela loja';
    _target_url := '/entregador/historico';
    _tag := 'rota66-pedido-pagamento-' || NEW.id::text;
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
      'url', _target_url,
      'tag', _tag
    )
  );

  RETURN NEW;
END;
$$;