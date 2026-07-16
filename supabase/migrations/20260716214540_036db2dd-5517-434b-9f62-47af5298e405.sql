CREATE OR REPLACE FUNCTION public.expirar_coletas_atrasadas()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  qtd integer := 0;
BEGIN
  WITH expirados AS (
    UPDATE public.pedidos
       SET entregador_id = NULL,
           rota_id = NULL,
           rota_ordem = NULL,
           codigo_coleta = NULL,
           deadline_coleta_at = NULL,
           status = 'pronto',
           updated_at = now()
     WHERE status = 'em_rota'
       AND entregador_id IS NOT NULL
       AND deadline_coleta_at IS NOT NULL
       AND deadline_coleta_at < now()
    RETURNING id
  )
  SELECT count(*) INTO qtd FROM expirados;
  RETURN qtd;
END;
$$;