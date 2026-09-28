-- Integração logística externa (Pixel Palace -> ROTA 66)
-- A tabela mantém a idempotência da integração sem transformar o ROTA 66
-- em dono do pedido comercial.

create table if not exists public.integracao_entregas (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'pixel-palace',
  external_order_id text not null,
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, external_order_id)
);

create index if not exists integracao_entregas_pedido_id_idx
  on public.integracao_entregas (pedido_id);

alter table public.integracao_entregas enable row level security;

-- A integração usa apenas o service role no servidor. Não conceder acesso
-- direto a anon/authenticated evita exposição do vínculo externo.
revoke all on table public.integracao_entregas from anon, authenticated;

create or replace function public.touch_integracao_entregas_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_integracao_entregas_updated_at on public.integracao_entregas;
create trigger trg_integracao_entregas_updated_at
before update on public.integracao_entregas
for each row execute function public.touch_integracao_entregas_updated_at();
