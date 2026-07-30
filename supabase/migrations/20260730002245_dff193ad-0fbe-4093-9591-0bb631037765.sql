CREATE TABLE public.convocacoes_entregadores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  motivo text NOT NULL CHECK (motivo IN ('abertura','primeiro_pedido')),
  dia date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,
  destinatarios integer NOT NULL DEFAULT 0,
  enviados integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT convocacoes_entregadores_unica UNIQUE (loja_id, motivo, dia)
);

GRANT SELECT ON public.convocacoes_entregadores TO authenticated;
GRANT ALL ON public.convocacoes_entregadores TO service_role;

ALTER TABLE public.convocacoes_entregadores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin ve convocacoes"
ON public.convocacoes_entregadores
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE INDEX idx_convocacoes_loja_dia ON public.convocacoes_entregadores (loja_id, dia);