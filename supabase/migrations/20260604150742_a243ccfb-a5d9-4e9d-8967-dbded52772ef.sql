
-- =========================
-- LOJAS
-- =========================
CREATE TABLE public.lojas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  telefone TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  taxa_entrega_base NUMERIC(10,2) NOT NULL DEFAULT 0,
  horario_funcionamento JSONB NOT NULL DEFAULT '{}'::jsonb,
  logo_url TEXT,
  ativa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lojas_owner ON public.lojas(owner_id);
CREATE INDEX idx_lojas_slug ON public.lojas(slug);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lojas TO authenticated;
GRANT SELECT ON public.lojas TO anon;
GRANT ALL ON public.lojas TO service_role;

ALTER TABLE public.lojas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lojas ativas são públicas" ON public.lojas
  FOR SELECT TO anon USING (ativa = true);

CREATE POLICY "Dono vê sua loja" ON public.lojas
  FOR SELECT TO authenticated USING (auth.uid() = owner_id);

CREATE POLICY "Super admin vê todas" ON public.lojas
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Dono cria loja" ON public.lojas
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = owner_id AND public.has_role(auth.uid(), 'loja_admin')
  );

CREATE POLICY "Dono edita sua loja" ON public.lojas
  FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Super admin gerencia lojas" ON public.lojas
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_lojas_updated_at BEFORE UPDATE ON public.lojas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =========================
-- LOJA_ENTREGADORES (vínculo)
-- =========================
CREATE TABLE public.loja_entregadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  entregador_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (loja_id, entregador_id)
);

CREATE INDEX idx_le_loja ON public.loja_entregadores(loja_id);
CREATE INDEX idx_le_entregador ON public.loja_entregadores(entregador_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.loja_entregadores TO authenticated;
GRANT ALL ON public.loja_entregadores TO service_role;

ALTER TABLE public.loja_entregadores ENABLE ROW LEVEL SECURITY;

-- Função auxiliar: usuário é dono da loja?
CREATE OR REPLACE FUNCTION public.is_loja_owner(_user_id UUID, _loja_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.lojas WHERE id = _loja_id AND owner_id = _user_id)
$$;

CREATE POLICY "Dono da loja vê seus entregadores" ON public.loja_entregadores
  FOR SELECT TO authenticated USING (public.is_loja_owner(auth.uid(), loja_id));

CREATE POLICY "Entregador vê seus vínculos" ON public.loja_entregadores
  FOR SELECT TO authenticated USING (auth.uid() = entregador_id);

CREATE POLICY "Dono gerencia entregadores" ON public.loja_entregadores
  FOR ALL TO authenticated
  USING (public.is_loja_owner(auth.uid(), loja_id))
  WITH CHECK (public.is_loja_owner(auth.uid(), loja_id));

CREATE POLICY "Super admin gerencia vínculos" ON public.loja_entregadores
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- =========================
-- PEDIDOS
-- =========================
CREATE TYPE public.pedido_status AS ENUM (
  'novo','aceito','em_preparo','pronto','em_rota','entregue','cancelado'
);

CREATE TYPE public.forma_pagamento AS ENUM ('pix','dinheiro','cartao_credito','cartao_debito');

CREATE TABLE public.pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero SERIAL NOT NULL,
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  cliente_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  cliente_nome TEXT NOT NULL,
  cliente_telefone TEXT NOT NULL,
  endereco_entrega TEXT NOT NULL,
  cidade TEXT,
  complemento TEXT,
  itens JSONB NOT NULL DEFAULT '[]'::jsonb,
  valor_produtos NUMERIC(10,2) NOT NULL DEFAULT 0,
  taxa_entrega NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  forma_pagamento public.forma_pagamento NOT NULL DEFAULT 'pix',
  troco_para NUMERIC(10,2),
  status public.pedido_status NOT NULL DEFAULT 'novo',
  entregador_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pedidos_loja ON public.pedidos(loja_id);
CREATE INDEX idx_pedidos_entregador ON public.pedidos(entregador_id);
CREATE INDEX idx_pedidos_status ON public.pedidos(status);
CREATE INDEX idx_pedidos_created ON public.pedidos(created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pedidos TO authenticated;
GRANT INSERT ON public.pedidos TO anon;
GRANT ALL ON public.pedidos TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.pedidos_numero_seq TO authenticated, anon, service_role;

ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dono da loja vê pedidos" ON public.pedidos
  FOR SELECT TO authenticated USING (public.is_loja_owner(auth.uid(), loja_id));

CREATE POLICY "Entregador vê seus pedidos" ON public.pedidos
  FOR SELECT TO authenticated USING (auth.uid() = entregador_id);

CREATE POLICY "Cliente vê seus próprios pedidos" ON public.pedidos
  FOR SELECT TO authenticated USING (auth.uid() = cliente_user_id);

CREATE POLICY "Super admin vê pedidos" ON public.pedidos
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Cliente cria pedido (auth)" ON public.pedidos
  FOR INSERT TO authenticated WITH CHECK (
    cliente_user_id IS NULL OR auth.uid() = cliente_user_id
  );

CREATE POLICY "Cliente cria pedido (anon)" ON public.pedidos
  FOR INSERT TO anon WITH CHECK (cliente_user_id IS NULL);

CREATE POLICY "Dono atualiza pedido da loja" ON public.pedidos
  FOR UPDATE TO authenticated
  USING (public.is_loja_owner(auth.uid(), loja_id))
  WITH CHECK (public.is_loja_owner(auth.uid(), loja_id));

CREATE POLICY "Entregador atualiza seu pedido" ON public.pedidos
  FOR UPDATE TO authenticated
  USING (auth.uid() = entregador_id)
  WITH CHECK (auth.uid() = entregador_id);

CREATE TRIGGER trg_pedidos_updated_at BEFORE UPDATE ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Realtime para pedidos (painel ao vivo)
ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos;
