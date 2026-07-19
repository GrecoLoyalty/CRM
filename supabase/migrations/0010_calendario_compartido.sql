-- =====================================================================
-- 0010 — Calendario compartido (agenda de equipo)
-- =====================================================================
-- Agenda visible para todo el equipo: cualquiera puede dar de alta un
-- evento, invitar a quien haga falta, y ligarlo opcionalmente a un
-- cliente. Cada persona tiene un color único y consistente para que sus
-- eventos se distingan de un vistazo en el calendario.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Color único por persona
-- ---------------------------------------------------------------------
alter table perfiles add column color_calendario text;

-- Paleta fija de 8 colores con buen contraste sobre el fondo oscuro del CRM.
-- Se asigna de forma determinística según el id de cada persona, así nunca
-- cambia entre sesiones ni hay que pedirle a nadie que elija uno.
create or replace function fn_color_calendario(p_id uuid) returns text as $$
  select (array['#3AA7A1','#5B8DEF','#F2B84B','#E4694A','#9B6BD9','#4FBF83','#E4568C','#5FA8D3'])
    [ ((('x' || substr(md5(p_id::text), 1, 8))::bit(32)::bigint % 8) + 1) ];
$$ language sql immutable;

update perfiles set color_calendario = fn_color_calendario(id) where color_calendario is null;

create or replace function fn_asignar_color_calendario() returns trigger as $$
begin
  if new.color_calendario is null then
    new.color_calendario := fn_color_calendario(new.id);
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_asignar_color_calendario before insert on perfiles
  for each row execute function fn_asignar_color_calendario();

-- ---------------------------------------------------------------------
-- 2. Eventos del calendario
-- ---------------------------------------------------------------------
create table eventos_calendario (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descripcion text,
  fecha_inicio timestamptz not null,
  fecha_fin timestamptz not null,
  todo_el_dia boolean not null default false,
  ubicacion text,
  cliente_id uuid references clientes(id) on delete set null,
  creado_por uuid not null references perfiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table eventos_calendario is
  'Agenda compartida: cualquier persona del equipo puede crear un evento e invitar a quien necesite. Todos ven todos los eventos (RLS de solo lectura abierta); solo quien lo creó, o Root/CEO, puede editarlo o borrarlo.';

create index idx_eventos_calendario_rango on eventos_calendario(fecha_inicio, fecha_fin);
create index idx_eventos_calendario_cliente on eventos_calendario(cliente_id);

create or replace function fn_tocar_updated_at() returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create trigger trg_eventos_calendario_updated_at before update on eventos_calendario
  for each row execute function fn_tocar_updated_at();

-- ---------------------------------------------------------------------
-- 3. Invitados de cada evento
-- ---------------------------------------------------------------------
create table evento_invitados (
  evento_id uuid not null references eventos_calendario(id) on delete cascade,
  perfil_id uuid not null references perfiles(id) on delete cascade,
  respuesta text not null default 'pendiente' check (respuesta in ('pendiente', 'acepta', 'rechaza')),
  created_at timestamptz not null default now(),
  primary key (evento_id, perfil_id)
);

comment on table evento_invitados is
  'Quiénes están invitados a cada evento del calendario compartido, y si ya confirmaron asistencia.';

create index idx_evento_invitados_perfil on evento_invitados(perfil_id);

-- ---------------------------------------------------------------------
-- 4. RLS — agenda abierta para leer, controlada para escribir
-- ---------------------------------------------------------------------
alter table eventos_calendario enable row level security;
alter table evento_invitados enable row level security;

-- Todos ven todos los eventos (es una agenda de equipo, no privada).
create policy eventos_calendario_select on eventos_calendario for select
  using (auth.role() = 'authenticated');

-- Cualquiera puede crear un evento, siempre y cuando quede registrado como su creador.
create policy eventos_calendario_insert on eventos_calendario for insert
  with check (creado_por = auth.uid());

-- Solo quien lo creó, o Root/CEO, puede editarlo o borrarlo.
create policy eventos_calendario_update on eventos_calendario for update
  using (creado_por = auth.uid() or fn_mi_rol() in ('root', 'ceo'));
create policy eventos_calendario_delete on eventos_calendario for delete
  using (creado_por = auth.uid() or fn_mi_rol() in ('root', 'ceo'));

-- Todos ven la lista de invitados de cualquier evento (para saber "quién más va").
create policy evento_invitados_select on evento_invitados for select
  using (auth.role() = 'authenticated');

-- Solo el creador del evento (o Root/CEO) arma/edita la lista de invitados...
create policy evento_invitados_write_organizador on evento_invitados for all
  using (
    fn_mi_rol() in ('root', 'ceo')
    or exists (select 1 from eventos_calendario e where e.id = evento_id and e.creado_por = auth.uid())
  );

-- ...y cada invitado puede actualizar únicamente su propia respuesta (RSVP).
create policy evento_invitados_rsvp_propio on evento_invitados for update
  using (perfil_id = auth.uid())
  with check (perfil_id = auth.uid());

-- =====================================================================
-- REALTIME — para que el calendario se actualice en vivo para todos
-- =====================================================================
alter publication supabase_realtime add table eventos_calendario;
alter publication supabase_realtime add table evento_invitados;
