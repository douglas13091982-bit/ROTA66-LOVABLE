
CREATE TABLE public.treinamento_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  youtube_url TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.treinamento_videos TO authenticated;
GRANT ALL ON public.treinamento_videos TO service_role;

ALTER TABLE public.treinamento_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ver videos ativos"
  ON public.treinamento_videos FOR SELECT
  TO authenticated
  USING (ativo = true OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin gerencia videos"
  ON public.treinamento_videos FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_treinamento_videos_updated_at
  BEFORE UPDATE ON public.treinamento_videos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
