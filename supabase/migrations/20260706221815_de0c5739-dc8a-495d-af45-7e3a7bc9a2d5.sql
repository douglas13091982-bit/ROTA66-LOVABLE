
-- 1) Table
CREATE TABLE public.loja_funcionarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL UNIQUE,
  nome text NOT NULL,
  email text NOT NULL,
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX loja_funcionarios_loja_id_idx ON public.loja_funcionarios(loja_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.loja_funcionarios TO authenticated;
GRANT ALL ON public.loja_funcionarios TO service_role;

ALTER TABLE public.loja_funcionarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dono ve funcionarios" ON public.loja_funcionarios
  FOR SELECT USING (public.is_loja_owner(auth.uid(), loja_id));
CREATE POLICY "Dono cria funcionarios" ON public.loja_funcionarios
  FOR INSERT WITH CHECK (public.is_loja_owner(auth.uid(), loja_id));
CREATE POLICY "Dono remove funcionarios" ON public.loja_funcionarios
  FOR DELETE USING (public.is_loja_owner(auth.uid(), loja_id));
CREATE POLICY "Funcionario ve seu vinculo" ON public.loja_funcionarios
  FOR SELECT USING (user_id = auth.uid());

CREATE TRIGGER trg_loja_funcionarios_updated
  BEFORE UPDATE ON public.loja_funcionarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Plano: maximo de funcionarios
ALTER TABLE public.planos_loja
  ADD COLUMN IF NOT EXISTS max_funcionarios integer NOT NULL DEFAULT 0;

-- 3) Helper: is_loja_funcionario
CREATE OR REPLACE FUNCTION public.is_loja_funcionario(_user_id uuid, _loja_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.loja_funcionarios
    WHERE loja_id = _loja_id AND user_id = _user_id
  )
$$;

-- 4) Update chat access helper to include funcionarios
CREATE OR REPLACE FUNCTION public.pode_acessar_chat_pedido(_user_id uuid, _pedido_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.id = _pedido_id
      AND (
        public.is_loja_owner(_user_id, p.loja_id)
        OR public.is_loja_funcionario(_user_id, p.loja_id)
        OR (p.entregador_id IS NOT NULL AND p.entregador_id = _user_id)
      )
  )
$$;

-- 5) Supplemental RLS policies granting funcionarios access to operational tables
-- Pedidos
CREATE POLICY "Funcionario ve pedidos" ON public.pedidos
  FOR SELECT USING (public.is_loja_funcionario(auth.uid(), loja_id));
CREATE POLICY "Funcionario atualiza pedidos" ON public.pedidos
  FOR UPDATE USING (public.is_loja_funcionario(auth.uid(), loja_id))
  WITH CHECK (public.is_loja_funcionario(auth.uid(), loja_id));
CREATE POLICY "Funcionario cria pedidos" ON public.pedidos
  FOR INSERT WITH CHECK (public.is_loja_funcionario(auth.uid(), loja_id));

-- Produtos
CREATE POLICY "Funcionario gerencia produtos" ON public.produtos
  FOR ALL USING (public.is_loja_funcionario(auth.uid(), loja_id))
  WITH CHECK (public.is_loja_funcionario(auth.uid(), loja_id));

-- Agendamentos
CREATE POLICY "Funcionario gerencia agendamentos" ON public.agendamentos
  FOR ALL USING (public.is_loja_funcionario(auth.uid(), loja_id))
  WITH CHECK (public.is_loja_funcionario(auth.uid(), loja_id));

CREATE POLICY "Funcionario ve aceites turnos" ON public.agendamento_aceites
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.agendamentos a
    WHERE a.id = agendamento_aceites.agendamento_id
      AND public.is_loja_funcionario(auth.uid(), a.loja_id)
  ));

CREATE POLICY "Funcionario ve ofertas turnos" ON public.agendamento_ofertas
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.agendamentos a
    WHERE a.id = agendamento_ofertas.agendamento_id
      AND public.is_loja_funcionario(auth.uid(), a.loja_id)
  ));

-- Clientes loja
CREATE POLICY "Funcionario gerencia clientes" ON public.clientes_loja
  FOR ALL USING (public.is_loja_funcionario(auth.uid(), loja_id))
  WITH CHECK (public.is_loja_funcionario(auth.uid(), loja_id));

-- Loja entregadores
CREATE POLICY "Funcionario ve entregadores" ON public.loja_entregadores
  FOR SELECT USING (public.is_loja_funcionario(auth.uid(), loja_id));
CREATE POLICY "Funcionario gerencia entregadores" ON public.loja_entregadores
  FOR ALL USING (public.is_loja_funcionario(auth.uid(), loja_id))
  WITH CHECK (public.is_loja_funcionario(auth.uid(), loja_id) AND public.is_entregador_aprovado(entregador_id));

-- Enderecos coleta
CREATE POLICY "Funcionario gerencia enderecos" ON public.lojas_enderecos_coleta
  FOR ALL USING (public.is_loja_funcionario(auth.uid(), loja_id))
  WITH CHECK (public.is_loja_funcionario(auth.uid(), loja_id));

-- Pedido mensagens (funcionario envia como loja)
CREATE POLICY "Funcionario envia mensagens" ON public.pedido_mensagens
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND sender_role = 'loja'
    AND EXISTS (
      SELECT 1 FROM public.pedidos p
      WHERE p.id = pedido_mensagens.pedido_id
        AND public.is_loja_funcionario(auth.uid(), p.loja_id)
    )
  );

-- Entregador status / status_conta
CREATE POLICY "Funcionario ve status entregadores vinc" ON public.entregador_status
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.loja_entregadores le
    WHERE le.entregador_id = entregador_status.entregador_id
      AND le.ativo = true
      AND public.is_loja_funcionario(auth.uid(), le.loja_id)
  ));

CREATE POLICY "Funcionario ve status conta entregadores vinc" ON public.entregador_status_conta
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.loja_entregadores le
    WHERE le.entregador_id = entregador_status_conta.entregador_id
      AND public.is_loja_funcionario(auth.uid(), le.loja_id)
  ));

-- Lojas (funcionario ve dados da loja)
CREATE POLICY "Funcionario ve sua loja" ON public.lojas
  FOR SELECT USING (public.is_loja_funcionario(auth.uid(), id));

-- Suporte tickets/mensagens
CREATE POLICY "Funcionario ve tickets" ON public.suporte_tickets
  FOR SELECT USING (public.is_loja_funcionario(auth.uid(), loja_id));
CREATE POLICY "Funcionario cria tickets" ON public.suporte_tickets
  FOR INSERT WITH CHECK (public.is_loja_funcionario(auth.uid(), loja_id) AND criado_por = auth.uid());
CREATE POLICY "Funcionario atualiza tickets" ON public.suporte_tickets
  FOR UPDATE USING (public.is_loja_funcionario(auth.uid(), loja_id))
  WITH CHECK (public.is_loja_funcionario(auth.uid(), loja_id));

CREATE POLICY "Funcionario ve msgs ticket" ON public.suporte_mensagens
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.suporte_tickets t
    WHERE t.id = suporte_mensagens.ticket_id
      AND public.is_loja_funcionario(auth.uid(), t.loja_id)
  ));
CREATE POLICY "Funcionario envia msg ticket" ON public.suporte_mensagens
  FOR INSERT WITH CHECK (
    autor_id = auth.uid()
    AND autor_tipo = 'loja'::suporte_autor_tipo
    AND EXISTS (
      SELECT 1 FROM public.suporte_tickets t
      WHERE t.id = suporte_mensagens.ticket_id
        AND public.is_loja_funcionario(auth.uid(), t.loja_id)
    )
  );
