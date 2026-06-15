
CREATE TABLE IF NOT EXISTS public.private_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON public.private_config FROM PUBLIC;
REVOKE ALL ON public.private_config FROM anon;
REVOKE ALL ON public.private_config FROM authenticated;
GRANT ALL ON public.private_config TO service_role;

ALTER TABLE public.private_config ENABLE ROW LEVEL SECURITY;

INSERT INTO public.private_config (key, value)
VALUES ('push_trigger_secret', 'aa7f32b9fd51fe727b4430cae9bed5f0ff2e812bc5d5b2896ec40302cd44a8bc')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

CREATE OR REPLACE FUNCTION public.get_private_config(_key text)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT value FROM public.private_config WHERE key = _key;
$$;
REVOKE ALL ON FUNCTION public.get_private_config(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_private_config(text) FROM anon;
REVOKE ALL ON FUNCTION public.get_private_config(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_private_config(text) TO service_role;

CREATE OR REPLACE FUNCTION public.notificar_entregador_pedido()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _url text := 'https://drive-fleet.lovable.app/api/public/send-push';
  _secret text;
  _title text;
  _body text;
  _target_url text;
  _user uuid;
BEGIN
  SELECT value INTO _secret FROM public.private_config WHERE key = 'push_trigger_secret';
  IF _secret IS NULL THEN RETURN NEW; END IF;

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
