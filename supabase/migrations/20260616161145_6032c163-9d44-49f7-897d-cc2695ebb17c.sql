DROP FUNCTION IF EXISTS public.get_mp_config_dono(uuid);

CREATE OR REPLACE FUNCTION public.salvar_mp_config(
  _loja_id uuid,
  _access_token text,
  _public_key text,
  _ativo boolean,
  _webhook_secret text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
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
    COALESCE(_ws, encode(gen_random_bytes(24), 'hex'))
  )
  ON CONFLICT (loja_id) DO UPDATE
    SET access_token = EXCLUDED.access_token,
        public_key = EXCLUDED.public_key,
        ativo = EXCLUDED.ativo,
        webhook_secret = COALESCE(_ws, public.lojas_pagamento_mp.webhook_secret),
        updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.salvar_mp_config(uuid, text, text, boolean, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_mp_config_dono(_loja_id uuid)
RETURNS TABLE(
  public_key text,
  access_token_masked text,
  ativo boolean,
  configurado boolean,
  webhook_secret_masked text,
  webhook_secret_configurado boolean
)
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
      true AS configurado,
      CASE WHEN length(m.webhook_secret) > 8
           THEN repeat('•', 10) || right(m.webhook_secret, 4)
           ELSE repeat('•', 8) END AS webhook_secret_masked,
      (m.webhook_secret IS NOT NULL AND length(m.webhook_secret) > 0) AS webhook_secret_configurado
    FROM public.lojas_pagamento_mp m
    WHERE m.loja_id = _loja_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_mp_config_dono(uuid) TO authenticated;