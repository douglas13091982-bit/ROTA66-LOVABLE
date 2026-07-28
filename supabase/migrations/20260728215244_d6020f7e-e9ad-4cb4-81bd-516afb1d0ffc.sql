DROP TRIGGER IF EXISTS trg_enforce_plano_para_vincular_entregador ON public.loja_entregadores;
DROP TRIGGER IF EXISTS enforce_plano_para_vincular_entregador ON public.loja_entregadores;
DROP FUNCTION IF EXISTS public.enforce_plano_para_vincular_entregador() CASCADE;