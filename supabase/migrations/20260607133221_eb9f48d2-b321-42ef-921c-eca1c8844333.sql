CREATE OR REPLACE FUNCTION public.pedidos_entregador_update_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  -- Sem auth (service_role, jobs internos): sem restrição
  IF _uid IS NULL THEN
    RETURN NEW;
  END IF;

  -- Super admin e dono da loja: sem restrição
  IF public.has_role(_uid, 'super_admin'::public.app_role) THEN
    RETURN NEW;
  END IF;
  IF public.is_loja_owner(_uid, OLD.loja_id) THEN
    RETURN NEW;
  END IF;

  -- A partir daqui o caller é o entregador (única outra role com UPDATE permitido pela RLS)

  -- Bloqueia campos financeiros
  IF NEW.taxa_entrega IS DISTINCT FROM OLD.taxa_entrega
     OR NEW.valor_total IS DISTINCT FROM OLD.valor_total
     OR NEW.valor_produtos IS DISTINCT FROM OLD.valor_produtos
     OR NEW.entrega_paga IS DISTINCT FROM OLD.entrega_paga
     OR NEW.entrega_paga_em IS DISTINCT FROM OLD.entrega_paga_em
     OR NEW.forma_pagamento IS DISTINCT FROM OLD.forma_pagamento
     OR NEW.troco_para IS DISTINCT FROM OLD.troco_para THEN
    RAISE EXCEPTION 'Entregador não pode alterar campos financeiros do pedido';
  END IF;

  -- Bloqueia dados do cliente/pedido
  IF NEW.cliente_user_id IS DISTINCT FROM OLD.cliente_user_id
     OR NEW.cliente_nome IS DISTINCT FROM OLD.cliente_nome
     OR NEW.cliente_telefone IS DISTINCT FROM OLD.cliente_telefone
     OR NEW.endereco_entrega IS DISTINCT FROM OLD.endereco_entrega
     OR NEW.complemento IS DISTINCT FROM OLD.complemento
     OR NEW.cidade IS DISTINCT FROM OLD.cidade
     OR NEW.endereco_coleta IS DISTINCT FROM OLD.endereco_coleta
     OR NEW.loja_id IS DISTINCT FROM OLD.loja_id
     OR NEW.numero IS DISTINCT FROM OLD.numero
     OR NEW.itens::text IS DISTINCT FROM OLD.itens::text
     OR NEW.arquivado IS DISTINCT FROM OLD.arquivado THEN
    RAISE EXCEPTION 'Entregador não pode alterar dados do cliente ou do pedido';
  END IF;

  -- Códigos de confirmação
  IF NEW.codigo_entrega IS DISTINCT FROM OLD.codigo_entrega THEN
    RAISE EXCEPTION 'Entregador não pode alterar código de entrega';
  END IF;
  IF NEW.codigo_coleta IS DISTINCT FROM OLD.codigo_coleta
     AND NOT (OLD.entregador_id IS NULL AND NEW.entregador_id = _uid) THEN
    RAISE EXCEPTION 'Código de coleta só pode ser definido no momento do aceite';
  END IF;

  -- Status: só permite pronto -> em_rota no momento do aceite
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (OLD.status = 'pronto'::pedido_status
            AND NEW.status = 'em_rota'::pedido_status
            AND OLD.entregador_id IS NULL
            AND NEW.entregador_id = _uid) THEN
      RAISE EXCEPTION 'Mudanças de status devem usar confirmar_coleta / confirmar_entrega';
    END IF;
  END IF;

  -- entregador_id: só NULL -> self
  IF NEW.entregador_id IS DISTINCT FROM OLD.entregador_id THEN
    IF NOT (OLD.entregador_id IS NULL AND NEW.entregador_id = _uid) THEN
      RAISE EXCEPTION 'Entregador não pode reatribuir o pedido';
    END IF;
  END IF;

  -- Carimbos de confirmação devem vir das RPCs security-definer
  IF NEW.coleta_confirmada_em IS DISTINCT FROM OLD.coleta_confirmada_em
     OR NEW.entrega_confirmada_em IS DISTINCT FROM OLD.entrega_confirmada_em THEN
    RAISE EXCEPTION 'Confirmações de coleta/entrega devem ser feitas via RPC';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pedidos_entregador_update_guard ON public.pedidos;
CREATE TRIGGER pedidos_entregador_update_guard
BEFORE UPDATE ON public.pedidos
FOR EACH ROW
EXECUTE FUNCTION public.pedidos_entregador_update_guard();