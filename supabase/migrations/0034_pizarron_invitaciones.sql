create table pizarron_invitaciones (
  id uuid primary key default gen_random_uuid(),
  pizarron_id uuid not null references pizarrones(id) on delete cascade,
  creado_por uuid not null references perfiles(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index idx_pizarron_invitaciones_activa
  on pizarron_invitaciones(pizarron_id)
  where activo;

create table pizarrones_compartidos (
  pizarron_id uuid not null references pizarrones(id) on delete cascade,
  perfil_id uuid not null references perfiles(id) on delete cascade,
  invitacion_id uuid not null references pizarron_invitaciones(id) on delete cascade,
  agregado_at timestamptz not null default now(),
  primary key (pizarron_id, perfil_id)
);

create index idx_pizarrones_compartidos_perfil
  on pizarrones_compartidos(perfil_id);

alter table pizarron_invitaciones enable row level security;
alter table pizarrones_compartidos enable row level security;

create policy pizarron_invitaciones_select on pizarron_invitaciones
  for select using (
    creado_por = auth.uid()
    or fn_mi_rol() in ('root', 'ceo')
    or exists (
      select 1 from pizarrones p
      where p.id = pizarron_id and p.creado_por = auth.uid()
    )
  );

create policy pizarron_invitaciones_insert on pizarron_invitaciones
  for insert with check (
    creado_por = auth.uid()
    and exists (
      select 1 from pizarrones p
      where p.id = pizarron_id
        and (p.creado_por = auth.uid() or fn_mi_rol() in ('root', 'ceo'))
    )
  );

create policy pizarron_invitaciones_update on pizarron_invitaciones
  for update
  using (
    creado_por = auth.uid()
    or fn_mi_rol() in ('root', 'ceo')
    or exists (
      select 1 from pizarrones p
      where p.id = pizarron_id and p.creado_por = auth.uid()
    )
  )
  with check (
    (
      creado_por = auth.uid()
      or fn_mi_rol() in ('root', 'ceo')
      or exists (
        select 1 from pizarrones p
        where p.id = pizarron_id and p.creado_por = auth.uid()
      )
    )
    and exists (
      select 1 from pizarrones p
      where p.id = pizarron_id
        and (p.creado_por = auth.uid() or fn_mi_rol() in ('root', 'ceo'))
    )
  );

create policy pizarrones_compartidos_select on pizarrones_compartidos
  for select using (perfil_id = auth.uid());

create policy pizarrones_compartidos_delete on pizarrones_compartidos
  for delete using (perfil_id = auth.uid());

drop policy pizarrones_select on pizarrones;
create policy pizarrones_select on pizarrones
  for select using (
    creado_por = auth.uid()
    or fn_mi_rol() in ('root', 'ceo')
    or exists (
      select 1 from pizarrones_compartidos pc
      where pc.pizarron_id = id and pc.perfil_id = auth.uid()
    )
  );

create or replace function fn_info_pizarron_invitacion(p_token uuid)
returns table (pizarron_id uuid, titulo text)
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select p.id, p.titulo
  from pizarron_invitaciones i
  join pizarrones p on p.id = i.pizarron_id
  where i.token = p_token and i.activo and auth.uid() is not null;
$$;

create or replace function fn_aceptar_pizarron_invitacion(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_usuario uuid := auth.uid();
  v_invitacion pizarron_invitaciones%rowtype;
begin
  if v_usuario is null then
    raise exception 'Inicia sesión para aceptar esta invitación.';
  end if;

  select * into v_invitacion
  from pizarron_invitaciones
  where token = p_token and activo;

  if not found then
    raise exception 'La invitación no existe o ya fue revocada.';
  end if;

  insert into pizarrones_compartidos (pizarron_id, perfil_id, invitacion_id)
  values (v_invitacion.pizarron_id, v_usuario, v_invitacion.id)
  on conflict (pizarron_id, perfil_id)
  do update set invitacion_id = excluded.invitacion_id;

  return v_invitacion.pizarron_id;
end;
$$;

create or replace function fn_revocar_pizarron_invitacion(p_pizarron_id uuid)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_usuario uuid := auth.uid();
begin
  if v_usuario is null or not exists (
    select 1 from pizarrones p
    where p.id = p_pizarron_id
      and (p.creado_por = v_usuario or fn_mi_rol() in ('root', 'ceo'))
  ) then
    raise exception 'No tienes permiso para revocar esta invitación.';
  end if;

  update pizarron_invitaciones
  set activo = false
  where pizarron_id = p_pizarron_id and activo;
end;
$$;

revoke all on function fn_info_pizarron_invitacion(uuid) from public, anon;
revoke all on function fn_aceptar_pizarron_invitacion(uuid) from public, anon;
revoke all on function fn_revocar_pizarron_invitacion(uuid) from public, anon;
grant execute on function fn_info_pizarron_invitacion(uuid) to authenticated;
grant execute on function fn_aceptar_pizarron_invitacion(uuid) to authenticated;
grant execute on function fn_revocar_pizarron_invitacion(uuid) to authenticated;

alter publication supabase_realtime add table pizarrones;
