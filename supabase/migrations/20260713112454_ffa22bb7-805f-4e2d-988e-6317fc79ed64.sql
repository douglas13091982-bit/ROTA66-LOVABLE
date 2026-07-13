
-- Trigger: ao pagar/atualizar fatura, revisa o bloqueio do franqueado
CREATE OR REPLACE FUNCTION public.trg_franqueado_revisar_bloqueio()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.franqueados_config c
     SET bloqueado_por_inadimplencia = EXISTS (
        SELECT 1 FROM public.franqueados_faturas f
        WHERE f.franqueado_user_id = c.user_id
          AND f.status IN ('pendente','vencido')
          AND f.vencimento < current_date - (c.dias_tolerancia || ' days')::interval
     )
   WHERE c.user_id = NEW.franqueado_user_id;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS tg_franqueado_revisar_bloqueio ON public.franqueados_faturas;
CREATE TRIGGER tg_franqueado_revisar_bloqueio
AFTER INSERT OR UPDATE OF status, vencimento ON public.franqueados_faturas
FOR EACH ROW EXECUTE FUNCTION public.trg_franqueado_revisar_bloqueio();

-- Regulariza estado atual de todos os franqueados
UPDATE public.franqueados_config c
   SET bloqueado_por_inadimplencia = EXISTS (
      SELECT 1 FROM public.franqueados_faturas f
      WHERE f.franqueado_user_id = c.user_id
        AND f.status IN ('pendente','vencido')
        AND f.vencimento < current_date - (c.dias_tolerancia || ' days')::interval
   );
