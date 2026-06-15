
-- 1. Enum extensions
ALTER TYPE public.forma_pagamento ADD VALUE IF NOT EXISTS 'pix_online';
ALTER TYPE public.forma_pagamento ADD VALUE IF NOT EXISTS 'cartao_online';
ALTER TYPE public.pedido_status ADD VALUE IF NOT EXISTS 'aguardando_pagamento';

-- 2. Tabela de credenciais Mercado Pago por loja
CREATE TABLE IF NOT EXISTS public.lojas_pagamento_mp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL UNIQUE REFERENCES public.lojas(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  public_key text NOT NULL,
  webhook_secret text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.lojas_pagamento_mp TO service_role;
-- Donos da loja não acessam diretamente: só via RPCs (token é secreto)

ALTER TABLE public.lojas_pagamento_mp ENABLE ROW LEVEL SECURITY;

-- Nenhuma policy para authenticated/anon: bloqueio total via Data API.
-- service_role bypassa RLS para acesso server-side.

CREATE TRIGGER trg_lojas_pagamento_mp_updated
BEFORE UPDATE ON public.lojas_pagamento_mp
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 3. RPC pública: catálogo descobre se loja aceita pagamento online (sem expor token)
CREATE OR REPLACE FUNCTION public.get_mp_public_config(_loja_id uuid)
RETURNS TABLE(public_key text, ativo boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public_key, ativo
  FROM public.lojas_pagamento_mp
  WHERE loja_id = _loja_id AND ativo = true;
$$;

GRANT EXECUTE ON FUNCTION public.get_mp_public_config(uuid) TO anon, authenticated;

-- 4. RPC do dono: salvar/atualizar credenciais
CREATE OR REPLACE FUNCTION public.salvar_mp_config(
  _loja_id uuid,
  _access_token text,
  _public_key text,
  _ativo boolean
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_loja_owner(auth.uid(), _loja_id) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  IF _access_token IS NULL OR length(trim(_access_token)) < 10 THEN
    RAISE EXCEPTION 'Access token inválido';
  END IF;
  IF _public_key IS NULL OR length(trim(_public_key)) < 10 THEN
    RAISE EXCEPTION 'Public key inválida';
  END IF;

  INSERT INTO public.lojas_pagamento_mp (loja_id, access_token, public_key, ativo)
  VALUES (_loja_id, _access_token, _public_key, COALESCE(_ativo, true))
  ON CONFLICT (loja_id) DO UPDATE
    SET access_token = EXCLUDED.access_token,
        public_key = EXCLUDED.public_key,
        ativo = EXCLUDED.ativo,
        updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.salvar_mp_config(uuid, text, text, boolean) TO authenticated;

-- 5. RPC do dono: ler config (mascarando o token)
CREATE OR REPLACE FUNCTION public.get_mp_config_dono(_loja_id uuid)
RETURNS TABLE(public_key text, access_token_masked text, ativo boolean, configurado boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_loja_owner(auth.uid(), _loja_id) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  RETURN QUERY
    SELECT
      m.public_key,
      CASE WHEN length(m.access_token) > 8
           THEN repeat('•', 10) || right(m.access_token, 4)
           ELSE repeat('•', 8) END AS access_token_masked,
      m.ativo,
      true AS configurado
    FROM public.lojas_pagamento_mp m
    WHERE m.loja_id = _loja_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_mp_config_dono(uuid) TO authenticated;

-- 6. Colunas de pagamento online em pedidos
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS mp_payment_id text,
  ADD COLUMN IF NOT EXISTS mp_payment_status text,
  ADD COLUMN IF NOT EXISTS mp_pix_expira_em timestamptz,
  ADD COLUMN IF NOT EXISTS pagamento_aprovado_em timestamptz;

CREATE INDEX IF NOT EXISTS idx_pedidos_mp_payment_id ON public.pedidos(mp_payment_id);

-- 7. Permite cliente anônimo ler o próprio status do pedido aguardando pagamento (para polling)
-- (já existe policy de leitura via rastrear_pedido RPC; criamos uma específica para o status MP)
CREATE OR REPLACE FUNCTION public.status_pagamento_pedido(_pedido_id uuid)
RETURNS TABLE(status pedido_status, mp_payment_status text, pagamento_aprovado_em timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT status, mp_payment_status, pagamento_aprovado_em
  FROM public.pedidos
  WHERE id = _pedido_id;
$$;

GRANT EXECUTE ON FUNCTION public.status_pagamento_pedido(uuid) TO anon, authenticated;
