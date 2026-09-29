-- 2026-09-29
-- O ROTA 66 não é mais dono de lojas/comércio.
-- Entregas recebidas por integração externa podem existir sem loja local.

alter table public.pedidos
  alter column loja_id drop not null;
