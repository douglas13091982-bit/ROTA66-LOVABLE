INSERT INTO public.config_creditos_entregador (singleton, ativo, mensalidade_valor, dia_vencimento, saldo_minimo, valores_recarga_sugeridos)
VALUES (true, false, 0, 10, 0, ARRAY[20, 50, 100]::numeric[])
ON CONFLICT (singleton) DO NOTHING;