
ALTER TABLE public.config_financeiro
  ADD COLUMN IF NOT EXISTS pix_chave_sistema text,
  ADD COLUMN IF NOT EXISTS pix_titular_sistema text,
  ADD COLUMN IF NOT EXISTS pix_cidade_sistema text;

ALTER TABLE public.cobrancas_loja
  ADD COLUMN IF NOT EXISTS pago_solicitado_em timestamp with time zone;

ALTER TABLE public.mensalidades_loja
  ADD COLUMN IF NOT EXISTS pago_solicitado_em timestamp with time zone;

-- Permite a loja marcar a própria cobrança como "pago solicitado"
DROP POLICY IF EXISTS "Dono da loja marca cobrança como solicitada" ON public.cobrancas_loja;
CREATE POLICY "Dono da loja marca cobrança como solicitada"
  ON public.cobrancas_loja
  FOR UPDATE
  TO authenticated
  USING (is_loja_owner(auth.uid(), loja_id))
  WITH CHECK (is_loja_owner(auth.uid(), loja_id));

DROP POLICY IF EXISTS "Dono da loja marca mensalidade como solicitada" ON public.mensalidades_loja;
CREATE POLICY "Dono da loja marca mensalidade como solicitada"
  ON public.mensalidades_loja
  FOR UPDATE
  TO authenticated
  USING (is_loja_owner(auth.uid(), loja_id))
  WITH CHECK (is_loja_owner(auth.uid(), loja_id));
