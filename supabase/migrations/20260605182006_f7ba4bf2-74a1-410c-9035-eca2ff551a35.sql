
-- Extension for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Subscriptions table
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX push_subscriptions_user_id_idx ON public.push_subscriptions(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário gerencia próprias inscrições push"
  ON public.push_subscriptions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Trigger function to dispatch push notifications for pedidos changes
CREATE OR REPLACE FUNCTION public.notificar_entregador_pedido()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _url text := 'https://drive-fleet.lovable.app/api/public/send-push';
  _secret text := 'bdb28767bb5c96028ae9c495d862cfdea121fc6139a4975e9b11116868726a26';
  _title text;
  _body text;
  _target_url text;
  _user uuid;
BEGIN
  -- Nova atribuição
  IF (TG_OP = 'UPDATE' AND OLD.entregador_id IS DISTINCT FROM NEW.entregador_id AND NEW.entregador_id IS NOT NULL) THEN
    _user := NEW.entregador_id;
    _title := 'Nova entrega para você';
    _body := 'Pedido #' || NEW.numero || ' — ' || COALESCE(NEW.endereco_entrega, 'endereço de entrega');
    _target_url := '/entregador/ativos';

  -- Mudança de status em pedido já atribuído
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

  -- Pagamento liberado
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
$$;

DROP TRIGGER IF EXISTS pedidos_notificar_entregador ON public.pedidos;
CREATE TRIGGER pedidos_notificar_entregador
  AFTER UPDATE ON public.pedidos
  FOR EACH ROW
  EXECUTE FUNCTION public.notificar_entregador_pedido();
