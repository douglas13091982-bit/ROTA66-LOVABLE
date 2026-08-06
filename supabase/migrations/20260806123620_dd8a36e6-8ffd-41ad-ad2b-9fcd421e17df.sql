CREATE OR REPLACE FUNCTION public.gerar_codigos_pedido()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Mantém o código de coleta como 4 dígitos aleatórios
  IF NEW.codigo_coleta IS NULL THEN
    NEW.codigo_coleta := lpad((floor(random()*10000))::int::text, 4, '0');
  END IF;

  -- Altera o código de entrega para ser os 4 últimos dígitos do telefone do cliente
  -- Caso o telefone não esteja disponível ou seja inválido, mantém o fallback aleatório
  IF NEW.codigo_entrega IS NULL THEN
    IF NEW.cliente_telefone IS NOT NULL AND length(regexp_replace(NEW.cliente_telefone, '\D', '', 'g')) >= 4 THEN
      NEW.codigo_entrega := right(regexp_replace(NEW.cliente_telefone, '\D', '', 'g'), 4);
    ELSE
      NEW.codigo_entrega := lpad((floor(random()*10000))::int::text, 4, '0');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;