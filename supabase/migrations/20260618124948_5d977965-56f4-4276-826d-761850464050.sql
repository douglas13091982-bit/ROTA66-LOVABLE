CREATE OR REPLACE FUNCTION public.suporte_after_message_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.autor_tipo = 'loja' THEN
    UPDATE public.suporte_tickets
       SET ultima_mensagem_em = NEW.created_at,
           updated_at = now(),
           nao_lidas_admin = nao_lidas_admin + 1,
           status = 'aberto'::public.suporte_ticket_status
     WHERE id = NEW.ticket_id;
  ELSE
    UPDATE public.suporte_tickets
       SET ultima_mensagem_em = NEW.created_at,
           updated_at = now(),
           nao_lidas_loja = nao_lidas_loja + 1,
           status = 'respondido'::public.suporte_ticket_status
     WHERE id = NEW.ticket_id;
  END IF;
  RETURN NEW;
END;
$$;