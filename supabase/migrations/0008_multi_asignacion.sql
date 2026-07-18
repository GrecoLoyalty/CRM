-- =====================================================================
-- 0008 — Multi-departamento por persona y multi-encargado por cliente
-- =====================================================================
-- Problema resuelto:
--   1) Una misma persona a veces atiende más de un departamento, pero
--      `perfiles.depto` solo admite uno. Se agrega `perfiles_departamentos`
--      como tabla puente (muchos-a-muchos) sin romper lo existente:
--      `perfiles.depto` se conserva como "departamento principal" y sigue
--      funcionando igual que antes para todo el código ya escrito.
--   2) Un cliente puede necesitar más de una persona por departamento
--      (ej. 2 vendedores, 3 en desarrollo, etc.), y `clientes.vendedor_id`
--      / `clientes.analista_id` / `tareas.asignado_a` solo admiten uno.
--      Se agrega `cliente_equipo` como tabla puente muchos-a-muchos:
--      (cliente, departamento, persona). Las columnas viejas se
--      conservan (compatibilidad), pero `cliente_equipo` pasa a ser la
--      fuente de verdad de "quién atiende a este cliente" para permisos,
--      chat, bóveda y el portal público.
--   3) El portal del cliente ahora puede mostrar el equipo completo que
--      lo atiende (nombre + departamento) para cada cliente.
--
-- Esta migración es aditiva: no elimina columnas ni tablas existentes,
-- y hace un backfill automático de los datos ya guardados.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. PERFILES_DEPARTAMENTOS — departamentos adicionales de una persona
-- ---------------------------------------------------------------------
create table perfiles_departamentos (
  perfil_id uuid not null references perfiles(id) on delete cascade,
  depto depto not null,
  created_at timestamptz not null default now(),
  primary key (perfil_id, depto)
);

comment on table perfiles_departamentos is
  'Departamentos adicionales de una persona, además de perfiles.depto (que sigue siendo su departamento principal/por defecto). Permite que alguien pertenezca a varios departamentos a la vez.';

-- Backfill: el depto principal actual también queda registrado aquí,
-- así `fn_mis_deptos()` es siempre la lista completa y única fuente de verdad para permisos.
insert into perfiles_departamentos (perfil_id, depto)
select id, depto from perfiles where depto is not null
on conflict do nothing;

create index idx_perfiles_departamentos_perfil on perfiles_departamentos(perfil_id);

-- ---------------------------------------------------------------------
-- 2. CLIENTE_EQUIPO — varias personas por departamento, por cliente
-- ---------------------------------------------------------------------
create table cliente_equipo (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  depto depto not null,
  perfil_id uuid not null references perfiles(id) on delete cascade,
  asignado_por uuid references perfiles(id),
  created_at timestamptz not null default now(),
  unique (cliente_id, depto, perfil_id)
);

comment on table cliente_equipo is
  'Equipo completo que atiende a un cliente: permite asignar más de una persona por departamento (ej. 2 vendedores + 3 de desarrollo para el mismo cliente). Es la fuente de verdad para "quién ve/atiende a este cliente" y para lo que ve el cliente en su portal.';

create index idx_cliente_equipo_cliente on cliente_equipo(cliente_id);
create index idx_cliente_equipo_perfil on cliente_equipo(perfil_id);
create index idx_cliente_equipo_depto on cliente_equipo(cliente_id, depto);

-- Backfill: vendedor_id / analista_id / tareas.asignado_a existentes
-- se copian a cliente_equipo para que nada quede "huérfano".
insert into cliente_equipo (cliente_id, depto, perfil_id)
select id, 'ventas'::depto, vendedor_id from clientes where vendedor_id is not null
on conflict do nothing;

insert into cliente_equipo (cliente_id, depto, perfil_id)
select id, 'analisis'::depto, analista_id from clientes where analista_id is not null
on conflict do nothing;

insert into cliente_equipo (cliente_id, depto, perfil_id)
select distinct cliente_id, depto, asignado_a from tareas where asignado_a is not null
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 3. Helpers de permisos: lista de departamentos del usuario actual
-- ---------------------------------------------------------------------
create or replace function fn_mis_deptos() returns depto[] as $$
  select coalesce(array_agg(distinct d), '{}'::depto[]) from (
    select depto as d from perfiles where id = auth.uid() and depto is not null
    union
    select depto as d from perfiles_departamentos where perfil_id = auth.uid()
  ) x;
$$ language sql stable security definer;

comment on function fn_mis_deptos() is
  'Todos los departamentos del usuario autenticado (principal + adicionales). Reemplaza a fn_mi_depto() para políticas que deben considerar multi-departamento; fn_mi_depto() se conserva sin cambios por compatibilidad.';

-- fn_es_encargado_cliente ahora también reconoce a cualquier miembro de
-- cliente_equipo (no solo vendedor_id/analista_id/tarea asignada).
create or replace function fn_es_encargado_cliente(p_cliente_id uuid) returns boolean as $$
  select exists (
    select 1 from clientes
    where id = p_cliente_id
      and (vendedor_id = auth.uid() or analista_id = auth.uid())
  )
  or exists (
    select 1 from tareas
    where cliente_id = p_cliente_id and asignado_a = auth.uid()
  )
  or exists (
    select 1 from cliente_equipo
    where cliente_id = p_cliente_id and perfil_id = auth.uid()
  );
$$ language sql stable security definer;

-- ---------------------------------------------------------------------
-- 4. RLS de las nuevas tablas
-- ---------------------------------------------------------------------
alter table perfiles_departamentos enable row level security;
alter table cliente_equipo enable row level security;

-- perfiles_departamentos: lectura para todos los autenticados (igual que
-- perfiles, se usa para armar selects de asignación); solo Root escribe.
create policy perfiles_departamentos_select on perfiles_departamentos
  for select using (auth.role() = 'authenticated');
create policy perfiles_departamentos_root_write on perfiles_departamentos
  for all using (fn_mi_rol() = 'root');

-- cliente_equipo: Root/CEO gestionan todo. Cualquiera que ya sea
-- encargado de ese cliente (vendedor, analista, tarea asignada o ya
-- forme parte del equipo) puede ver la lista completa del equipo.
create policy cliente_equipo_root_ceo on cliente_equipo
  for all using (fn_mi_rol() in ('root','ceo'));
create policy cliente_equipo_select_encargados on cliente_equipo
  for select using (fn_es_encargado_cliente(cliente_id));

-- ---------------------------------------------------------------------
-- 5. Ampliar políticas existentes para reconocer multi-departamento
--    y multi-encargado (cliente_equipo), sin quitar el acceso anterior.
-- ---------------------------------------------------------------------
drop policy if exists clientes_produccion on clientes;
create policy clientes_produccion on clientes for select
  using (
    fn_mi_rol() = 'produccion'
    and (
      id in (select cliente_id from tareas where asignado_a = auth.uid())
      or id in (select cliente_id from cliente_equipo where perfil_id = auth.uid())
    )
  );

-- Nueva política: cualquier rol que forme parte del equipo del cliente
-- (vía cliente_equipo) puede leerlo, sin importar su rol o departamento.
create policy clientes_equipo_select on clientes for select
  using (id in (select cliente_id from cliente_equipo where perfil_id = auth.uid()));

drop policy if exists tareas_propias_select on tareas;
create policy tareas_propias_select on tareas for select
  using (
    asignado_a = auth.uid()
    or depto = any(fn_mis_deptos())
  );

-- =====================================================================
-- REALTIME (para que la lista de equipo se refleje en vivo si se desea)
-- =====================================================================
alter publication supabase_realtime add table cliente_equipo;
