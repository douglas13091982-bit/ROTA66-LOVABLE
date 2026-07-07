UPDATE public.private_config
SET value = trim(both '"' from value)
WHERE key = 'loja_avulsa_id' AND value LIKE '"%"';