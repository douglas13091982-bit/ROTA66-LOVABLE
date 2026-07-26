DROP FUNCTION IF EXISTS public.get_entregadores_turnos_loja(uuid);
CREATE OR REPLACE FUNCTION public.get_entregadores_turnos_loja(_loja_id uuid)
RETURNS TABLE(
  agendamento_id uuid,
  entregador_id uuid,
  full_name text,
  avatar_url text,
  aceito_em timestamptz,
  horas_pagas boolean,
  motivo_nao_pagamento text,
  entregas_finalizadas integer,
  entregas_pendentes integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT ac.agendamento_id, p.id, p.full_name, p.avatar_url, ac.aceito_em,
         ac.horas_pagas, ac.motivo_nao_pagamento,
         COALESCE((
           SELECT COUNT(*)::int FROM public.pedidos pe
            WHERE pe.agendamento_id = ac.agendamento_id
              AND pe.entregador_id = ac.entregador_id
              AND pe.status = 'entregue'
         ), 0),
         COALESCE((
           SELECT COUNT(*)::int FROM public.pedidos pe
            WHERE pe.agendamento_id = ac.agendamento_id
              AND pe.entregador_id = ac.entregador_id
              AND pe.status NOT IN ('entregue','cancelado')
         ), 0)
    FROM public.agendamento_aceites ac
    JOIN public.agendamentos a ON a.id = ac.agendamento_id
    JOIN public.profiles p ON p.id = ac.entregador_id
   WHERE a.loja_id = _loja_id
     AND public.is_loja_owner(auth.uid(), _loja_id)
   ORDER BY ac.aceito_em ASC;
$function$;