
CREATE TABLE public.lojas_enderecos_coleta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  rotulo text NOT NULL,
  endereco text NOT NULL,
  lat numeric,
  lng numeric,
  padrao boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lojas_enderecos_coleta TO authenticated;
GRANT ALL ON public.lojas_enderecos_coleta TO service_role;

ALTER TABLE public.lojas_enderecos_coleta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dono da loja gerencia enderecos de coleta"
  ON public.lojas_enderecos_coleta
  FOR ALL
  TO authenticated
  USING (public.is_loja_owner(auth.uid(), loja_id))
  WITH CHECK (public.is_loja_owner(auth.uid(), loja_id));

CREATE INDEX idx_lojas_enderecos_coleta_loja ON public.lojas_enderecos_coleta(loja_id);
CREATE UNIQUE INDEX uniq_endereco_coleta_padrao_por_loja
  ON public.lojas_enderecos_coleta(loja_id) WHERE padrao = true;

CREATE TRIGGER lojas_enderecos_coleta_updated
  BEFORE UPDATE ON public.lojas_enderecos_coleta
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Garante apenas um padrão por loja: ao marcar um como padrão, desmarca os demais
CREATE OR REPLACE FUNCTION public.lojas_enderecos_coleta_unique_padrao()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.padrao = true THEN
    UPDATE public.lojas_enderecos_coleta
      SET padrao = false
      WHERE loja_id = NEW.loja_id
        AND id <> NEW.id
        AND padrao = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_lojas_enderecos_coleta_unique_padrao
  BEFORE INSERT OR UPDATE OF padrao ON public.lojas_enderecos_coleta
  FOR EACH ROW EXECUTE FUNCTION public.lojas_enderecos_coleta_unique_padrao();
