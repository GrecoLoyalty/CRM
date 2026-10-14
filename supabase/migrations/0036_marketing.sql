create table marcas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(trim(nombre)) between 1 and 100),
  logo_url text check (logo_url is null or logo_url ~* '^https?://'),
  color text not null default '#3AA7A1' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  plataformas_activas text[] not null default '{}'
    check (cardinality(plataformas_activas) > 0),
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index idx_marcas_nombre_activo on marcas(lower(nombre)) where activa;
create trigger trg_marcas_updated_at before update on marcas
  for each row execute function fn_tocar_updated_at();

create table guiones (
  id uuid primary key default gen_random_uuid(),
  marca_id uuid not null references marcas(id) on delete restrict,
  titulo text not null check (char_length(trim(titulo)) between 1 and 200),
  plataforma text not null,
  formato text not null,
  duracion_segundos integer check (duracion_segundos is null or duracion_segundos >= 0),
  gancho text not null default '',
  llamado_accion text not null default '',
  notas_grabacion text not null default '',
  estado text not null default 'borrador'
    check (estado in ('borrador', 'en_revision', 'aprobado', 'grabado')),
  creado_por uuid not null references perfiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_guiones_marca on guiones(marca_id, updated_at desc);
create trigger trg_guiones_updated_at before update on guiones
  for each row execute function fn_tocar_updated_at();

create table guion_escenas (
  id uuid primary key default gen_random_uuid(),
  guion_id uuid not null references guiones(id) on delete cascade,
  orden integer not null check (orden >= 0),
  visual text not null default '',
  audio text not null default '',
  texto_pantalla text not null default '',
  unique (guion_id, orden)
);

create table publicaciones (
  id uuid primary key default gen_random_uuid(),
  marca_id uuid not null references marcas(id) on delete restrict,
  plataforma text not null,
  fecha_hora timestamptz not null,
  guion_id uuid references guiones(id) on delete set null,
  caption text not null default '',
  hashtags text[] not null default '{}',
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'publicado', 'cancelado')),
  responsable_id uuid references perfiles(id) on delete set null,
  video_url text check (video_url is null or video_url ~* '^https?://'),
  descarga_url text check (descarga_url is null or descarga_url ~* '^https?://'),
  publicacion_url text check (publicacion_url is null or publicacion_url ~* '^https?://'),
  creado_por uuid not null references perfiles(id) on delete restrict,
  publicado_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_publicaciones_fecha on publicaciones(fecha_hora);
create index idx_publicaciones_responsable on publicaciones(responsable_id, fecha_hora)
  where estado = 'pendiente';
create index idx_publicaciones_marca on publicaciones(marca_id, fecha_hora);
create trigger trg_publicaciones_updated_at before update on publicaciones
  for each row execute function fn_tocar_updated_at();

create or replace function fn_validar_contenido_marketing()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_marca_id uuid := new.marca_id;
  v_plataforma text := new.plataforma;
  v_marca_plataformas text[];
  v_activa boolean;
  v_guion_id uuid;
begin
  select plataformas_activas, activa into v_marca_plataformas, v_activa
  from marcas where id = v_marca_id;

  if not found then
    raise exception 'La marca seleccionada no existe.';
  end if;

  if tg_op = 'INSERT' then
    if not v_activa or not (v_plataforma = any(v_marca_plataformas)) then
      raise exception 'La plataforma debe estar activa para la marca seleccionada.';
    end if;
  elsif new.marca_id is distinct from old.marca_id or new.plataforma is distinct from old.plataforma then
    if not v_activa or not (v_plataforma = any(v_marca_plataformas)) then
      raise exception 'La plataforma debe estar activa para la marca seleccionada.';
    end if;
  end if;

  if tg_table_name = 'publicaciones' then
    v_guion_id := nullif(to_jsonb(new)->>'guion_id', '')::uuid;
  end if;
  if v_guion_id is not null and not exists (
       select 1 from guiones g
       where g.id = v_guion_id and g.marca_id = new.marca_id
     ) then
    raise exception 'El guion debe pertenecer a la misma marca que la publicación.';
  end if;

  return new;
end;
$$;

create trigger trg_validar_guion_marketing before insert or update on guiones
  for each row execute function fn_validar_contenido_marketing();
create trigger trg_validar_publicacion_marketing before insert or update on publicaciones
  for each row execute function fn_validar_contenido_marketing();

create or replace function fn_proteger_rol_perfil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.id = auth.uid()
     and fn_mi_rol() <> 'root'
     and (new.role is distinct from old.role
       or new.depto is distinct from old.depto
       or new.subrol is distinct from old.subrol
       or new.activo is distinct from old.activo) then
    raise exception 'Solo Root puede cambiar roles, departamentos o accesos.';
  end if;
  return new;
end;
$$;

create trigger trg_proteger_rol_perfil before update on perfiles
  for each row execute function fn_proteger_rol_perfil();

create or replace function fn_marcar_publicacion(p_id uuid, p_publicacion_url text default null)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión para marcar la publicación.';
  end if;
  if nullif(trim(p_publicacion_url), '') is not null
     and trim(p_publicacion_url) !~* '^https?://' then
    raise exception 'El enlace de publicación debe usar http o https.';
  end if;

  update publicaciones
  set estado = 'publicado',
      publicado_at = now(),
      publicacion_url = coalesce(nullif(trim(p_publicacion_url), ''), publicacion_url)
  where id = p_id
    and responsable_id = auth.uid()
    and estado = 'pendiente';

  if not found then
    raise exception 'La publicación no existe, no está asignada a tu usuario o ya fue completada.';
  end if;
end;
$$;

create or replace function fn_reemplazar_escenas(p_guion_id uuid, p_escenas jsonb)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if auth.uid() is null or fn_mi_rol() not in ('root', 'ceo', 'marketing') then
    raise exception 'No tienes permiso para editar las escenas del guion.';
  end if;
  if jsonb_typeof(p_escenas) is distinct from 'array' then
    raise exception 'Las escenas deben enviarse como una lista.';
  end if;

  delete from guion_escenas where guion_id = p_guion_id;
  insert into guion_escenas (guion_id, orden, visual, audio, texto_pantalla)
  select p_guion_id, (item->>'orden')::integer,
         coalesce(item->>'visual', ''), coalesce(item->>'audio', ''),
         coalesce(item->>'texto_pantalla', '')
  from jsonb_array_elements(p_escenas) as escenas(item)
  order by (item->>'orden')::integer;
end;
$$;

revoke all on function fn_marcar_publicacion(uuid, text) from public, anon;
grant execute on function fn_marcar_publicacion(uuid, text) to authenticated;
revoke all on function fn_reemplazar_escenas(uuid, jsonb) from public, anon;
grant execute on function fn_reemplazar_escenas(uuid, jsonb) to authenticated;

alter table marcas enable row level security;
alter table guiones enable row level security;
alter table guion_escenas enable row level security;
alter table publicaciones enable row level security;

create policy marcas_select on marcas for select
  using (auth.role() = 'authenticated');
create policy marcas_manage on marcas for all
  using (fn_mi_rol() in ('root', 'ceo', 'marketing'))
  with check (fn_mi_rol() in ('root', 'ceo', 'marketing'));

create policy guiones_select on guiones for select using (
  fn_mi_rol() in ('root', 'ceo', 'marketing')
  or exists (
    select 1 from publicaciones p
    where p.guion_id = guiones.id
      and p.responsable_id = auth.uid()
      and p.estado = 'pendiente'
  )
);
create policy guiones_manage on guiones for all
  using (fn_mi_rol() in ('root', 'ceo', 'marketing'))
  with check (fn_mi_rol() in ('root', 'ceo', 'marketing'));

create policy guion_escenas_select on guion_escenas for select using (
  exists (select 1 from guiones g where g.id = guion_id)
);
create policy guion_escenas_manage on guion_escenas for all
  using (fn_mi_rol() in ('root', 'ceo', 'marketing'))
  with check (fn_mi_rol() in ('root', 'ceo', 'marketing'));

create policy publicaciones_select on publicaciones for select using (
  fn_mi_rol() in ('root', 'ceo', 'marketing')
  or responsable_id = auth.uid()
);
create policy publicaciones_manage on publicaciones for all
  using (fn_mi_rol() in ('root', 'ceo', 'marketing'))
  with check (fn_mi_rol() in ('root', 'ceo', 'marketing'));

alter publication supabase_realtime add table marcas;
alter publication supabase_realtime add table guiones;
alter publication supabase_realtime add table guion_escenas;
alter publication supabase_realtime add table publicaciones;
