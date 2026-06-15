
ALTER TABLE public.config_branding
  ADD COLUMN IF NOT EXISTS suporte_whatsapp text,
  ADD COLUMN IF NOT EXISTS suporte_horario text;
