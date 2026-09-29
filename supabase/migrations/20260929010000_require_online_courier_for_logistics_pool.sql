-- 2026-09-29
-- Segurança do pool logístico:
-- a RPC só deve expor/aceitar entregas para quem está realmente ONLINE.
-- O estado online é mantido em public.entregador_status.

create or replace function public.rota66_pool_entregas()
returns setof public.pedidos
language sql
security definer
set search_path = public
as $$
  select p.*
  from public.pedidos p
  where auth.uid() is not null
    and exists (
      select 1
      from public.profiles pr
      where pr.id = auth.uid()
    )
    and exists (
      select 1
      from public.entregador_status es
      where es.entregador_id = auth.uid()
        and es.online = true
        and es.updated_at >= now() - (
          coalesce(
            (select c.entregador_online_ttl_min from public.config_roteirizacao c where c.singleton = true limit 1),
            10
          ) * interval '1 minute'
        )
    )
    and p.status = 'pronto'::public.pedido_status
    and p.entregador_id is null
    and coalesce(p.arquivado, false) = false
  order by p.created_at asc;
$$;

revoke all on function public.rota66_pool_entregas() from public;
grant execute on function public.rota66_pool_entregas() to authenticated;

create or replace function public.rota66_aceitar_entrega(_pedido_id uuid)
returns public.pedidos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_pedido public.pedidos;
begin
  if v_user is null then
    raise exception 'Sessão expirada';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = v_user
  ) then
    raise exception 'Entregador não encontrado';
  end if;

  if not exists (
    select 1
    from public.entregador_status es
    where es.entregador_id = v_user
      and es.online = true
      and es.updated_at >= now() - (
        coalesce(
          (select c.entregador_online_ttl_min from public.config_roteirizacao c where c.singleton = true limit 1),
          10
        ) * interval '1 minute'
      )
  ) then
    raise exception 'Entregador precisa estar online para aceitar entregas';
  end if;

  -- Atualização atômica: somente um entregador pode ganhar o pedido.
  update public.pedidos
     set entregador_id = v_user,
         status = 'aceito'::public.pedido_status,
         codigo_coleta = coalesce(
           codigo_coleta,
           lpad((floor(random() * 10000))::int::text, 4, '0')
         ),
         updated_at = now()
   where id = _pedido_id
     and status = 'pronto'::public.pedido_status
     and entregador_id is null
   returning * into v_pedido;

  if not found then
    raise exception 'Pedido já foi aceito ou não está disponível';
  end if;

  return v_pedido;
end;
$$;

revoke all on function public.rota66_aceitar_entrega(uuid) from public;
grant execute on function public.rota66_aceitar_entrega(uuid) to authenticated;
