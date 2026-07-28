ALTER TABLE public.loja_entregadores
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pendente';

ALTER TABLE public.loja_entregadores
  DROP CONSTRAINT IF EXISTS loja_entregadores_status_check;
ALTER TABLE public.loja_entregadores
  ADD CONSTRAINT loja_entregadores_status_check
  CHECK (status IN ('pendente','aceito','recusado'));

UPDATE public.loja_entregadores SET status = 'aceito' WHERE status = 'pendente';

CREATE OR REPLACE FUNCTION public.tg_loja_entregadores_sync_ativo()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM 'aceito' THEN
    NEW.ativo := false;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.entregador_id IS DISTINCT FROM OLD.entregador_id THEN
    RAISE EXCEPTION 'entregador_id nao pode ser alterado';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.loja_id IS DISTINCT FROM OLD.loja_id THEN
    RAISE EXCEPTION 'loja_id nao pode ser alterado';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_loja_entregadores_sync_ativo ON public.loja_entregadores;
CREATE TRIGGER trg_loja_entregadores_sync_ativo
  BEFORE INSERT OR UPDATE ON public.loja_entregadores
  FOR EACH ROW EXECUTE FUNCTION public.tg_loja_entregadores_sync_ativo();

DROP POLICY IF EXISTS "Entregador responde seu vinculo" ON public.loja_entregadores;
CREATE POLICY "Entregador responde seu vinculo"
  ON public.loja_entregadores FOR UPDATE
  TO authenticated
  USING (auth.uid() = entregador_id)
  WITH CHECK (auth.uid() = entregador_id);

DROP POLICY IF EXISTS "Entregador remove seu vinculo" ON public.loja_entregadores;
CREATE POLICY "Entregador remove seu vinculo"
  ON public.loja_entregadores FOR DELETE
  TO authenticated
  USING (auth.uid() = entregador_id);

DROP FUNCTION IF EXISTS public.listar_entregadores_loja(uuid);
CREATE FUNCTION public.listar_entregadores_loja(_loja_id uuid)
 RETURNS TABLE(vinculo_id uuid, ativo boolean, created_at timestamp with time zone, entregador_id uuid, full_name text, phone text, avatar_url text, status text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH acesso AS (
    SELECT (
      public.is_loja_owner(auth.uid(), _loja_id)
      OR public.is_loja_funcionario(auth.uid(), _loja_id)
      OR public.admin_ve_loja(auth.uid(), _loja_id)
    ) AS ok
  )
  SELECT le.id, le.ativo, le.created_at, le.entregador_id, p.full_name, p.phone, p.avatar_url, le.status
  FROM public.loja_entregadores le
  LEFT JOIN public.profiles p ON p.id = le.entregador_id
  CROSS JOIN acesso a
  WHERE le.loja_id = _loja_id AND a.ok

  UNION

  SELECT NULL::uuid, true, MIN(pe.created_at), pe.entregador_id, p.full_name, p.phone, p.avatar_url, 'aceito'::text
  FROM public.pedidos pe
  LEFT JOIN public.profiles p ON p.id = pe.entregador_id
  CROSS JOIN acesso a
  WHERE pe.loja_id = _loja_id
    AND pe.entregador_id IS NOT NULL
    AND pe.status NOT IN ('entregue','cancelado')
    AND a.ok
    AND NOT EXISTS (
      SELECT 1 FROM public.loja_entregadores le2
      WHERE le2.loja_id = _loja_id AND le2.entregador_id = pe.entregador_id
    )
  GROUP BY pe.entregador_id, p.full_name, p.phone, p.avatar_url
  ORDER BY 3 DESC;
$function$;