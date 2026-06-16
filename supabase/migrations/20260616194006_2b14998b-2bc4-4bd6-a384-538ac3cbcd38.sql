CREATE OR REPLACE FUNCTION public.salvar_mp_config(
  _loja_id uuid,
  _access_token text,
  _public_key text,
  _ativo boolean,
  _webhook_secret text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _ws text;
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

  _ws := NULLIF(trim(COALESCE(_webhook_secret, '')), '');

  INSERT INTO public.lojas_pagamento_mp (loja_id, access_token, public_key, ativo, webhook_secret)
  VALUES (
    _loja_id,
    _access_token,
    _public_key,
    COALESCE(_ativo, true),
    COALESCE(_ws, encode(extensions.gen_random_bytes(24), 'hex'))
  )
  ON CONFLICT (loja_id) DO UPDATE
    SET access_token = EXCLUDED.access_token,
        public_key = EXCLUDED.public_key,
        ativo = EXCLUDED.ativo,
        webhook_secret = COALESCE(_ws, public.lojas_pagamento_mp.webhook_secret),
        updated_at = now();
END;
$$;