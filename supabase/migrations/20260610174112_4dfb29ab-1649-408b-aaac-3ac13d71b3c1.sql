-- Reescreve avatar_url para armazenar apenas o storage path (ex: "<uid>/avatar-123.jpg").
-- Aceita valores legados que eram signed URLs (.../object/sign/avatars/<path>?token=...)
-- ou public URLs (.../object/public/avatars/<path>). Valores que já são paths puros
-- são preservados.
UPDATE public.profiles
SET avatar_url = regexp_replace(
  split_part(avatar_url, '?', 1),
  '^.*/storage/v1/object/(?:sign|public)/avatars/',
  ''
)
WHERE avatar_url IS NOT NULL
  AND avatar_url ~ '/storage/v1/object/(sign|public)/avatars/';
