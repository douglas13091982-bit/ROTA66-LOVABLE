
-- Tabela de mensagens entre loja e entregador para um pedido
CREATE TABLE public.pedido_mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('entregador','loja')),
  mensagem text NOT NULL CHECK (length(trim(mensagem)) > 0 AND length(mensagem) <= 2000),
  lida_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pedido_mensagens_pedido ON public.pedido_mensagens(pedido_id, created_at);
CREATE INDEX idx_pedido_mensagens_unread ON public.pedido_mensagens(pedido_id) WHERE lida_em IS NULL;

GRANT SELECT, INSERT, UPDATE ON public.pedido_mensagens TO authenticated;
GRANT ALL ON public.pedido_mensagens TO service_role;

ALTER TABLE public.pedido_mensagens ENABLE ROW LEVEL SECURITY;

-- Função que verifica se o usuário é participante do pedido (loja owner ou entregador atribuído)
CREATE OR REPLACE FUNCTION public.pode_acessar_chat_pedido(_user_id uuid, _pedido_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.id = _pedido_id
      AND (
        public.is_loja_owner(_user_id, p.loja_id)
        OR (p.entregador_id IS NOT NULL AND p.entregador_id = _user_id)
      )
  );
$$;

-- SELECT: loja dona do pedido OU entregador atribuído
CREATE POLICY "Participantes leem mensagens do pedido"
ON public.pedido_mensagens FOR SELECT
TO authenticated
USING (public.pode_acessar_chat_pedido(auth.uid(), pedido_id));

-- INSERT: deve ser participante e enviar como si próprio com o role correto
CREATE POLICY "Participantes enviam mensagens"
ON public.pedido_mensagens FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND public.pode_acessar_chat_pedido(auth.uid(), pedido_id)
  AND (
    (sender_role = 'loja' AND EXISTS (
      SELECT 1 FROM public.pedidos p WHERE p.id = pedido_id AND public.is_loja_owner(auth.uid(), p.loja_id)
    ))
    OR
    (sender_role = 'entregador' AND EXISTS (
      SELECT 1 FROM public.pedidos p WHERE p.id = pedido_id AND p.entregador_id = auth.uid()
    ))
  )
);

-- UPDATE: somente para marcar como lida (lida_em) por participante diferente do remetente
CREATE POLICY "Participantes marcam como lida"
ON public.pedido_mensagens FOR UPDATE
TO authenticated
USING (
  public.pode_acessar_chat_pedido(auth.uid(), pedido_id)
  AND sender_id <> auth.uid()
)
WITH CHECK (
  public.pode_acessar_chat_pedido(auth.uid(), pedido_id)
  AND sender_id <> auth.uid()
);

-- Habilitar Realtime
ALTER TABLE public.pedido_mensagens REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pedido_mensagens;
