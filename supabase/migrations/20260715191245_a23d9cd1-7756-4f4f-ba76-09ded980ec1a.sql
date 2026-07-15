
-- Resolver cidade do franqueado também via colaboradores (herdam a cidade do franqueado dono)
CREATE OR REPLACE FUNCTION public.cidade_id_do_franqueado(_uid uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT city_id FROM public.franqueados_config WHERE user_id = _uid
  UNION ALL
  SELECT fc.city_id
    FROM public.franqueado_colaboradores fk
    JOIN public.franqueados_config fc ON fc.user_id = fk.franqueado_user_id
   WHERE fk.colaborador_user_id = _uid AND fk.ativo = true
  LIMIT 1;
$function$;

-- admin_ve_profile agora reconhece colaboradores (herdam city_id do franqueado dono)
CREATE OR REPLACE FUNCTION public.admin_ve_profile(_uid uuid, _profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.has_role(_uid, 'super_admin'::app_role)
     AND (
       public.is_franquia_owner(_uid)
       OR EXISTS (
         SELECT 1
         FROM public.profiles p
         WHERE p.id = _profile_id
           AND p.city_id IS NOT NULL
           AND public.cidade_id_do_franqueado(_uid) IS NOT NULL
           AND p.city_id = public.cidade_id_do_franqueado(_uid)
       )
     );
$function$;
