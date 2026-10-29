-- =====================================================================
-- 0042 — Módulo Scrum (Tecnología & Soluciones)
-- =====================================================================
-- Convierte el método de trabajo en reglas reales del sistema:
--   * scrum_equipo   → quién es Product Owner, Scrum Master, desarrollo o
--                      asesor, y cuántas horas por semana dedica.
--   * sprints        → ciclos de 2 semanas con objetivo, colchón de
--                      urgencias, reparto clientes/interno y retrospectiva.
--   * scrum_items    → Product Backlog único (historias, tareas, bugs y
--                      urgencias), con responsable, revisor y la
--                      Definición de "Terminado" (4 condiciones).
--   * scrum_dailies  → Daily escrito: qué hice, qué haré, qué me bloquea.
--
-- Reglas que viven en la base de datos (no solo en el botón):
--   1. Nadie aprueba su propio trabajo: el revisor no puede ser el responsable.
--   2. Para pasar a "en_revision" debe haber responsable y revisor.
--   3. Solo Root/CEO (el CTO) puede marcar "hecho", y solo si las 4
--      condiciones de la Definición de Terminado están cumplidas.
--   4. Solo el revisor (o Root/CEO) puede marcar "PR revisado".
--   5. Solo PO, Scrum Master y Root/CEO cambian prioridad o sprint.
--   6. Solo puede haber un sprint activo a la vez.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Equipo Scrum
-- ---------------------------------------------------------------------
create table scrum_equipo (
  perfil_id uuid primary key references perfiles(id) on delete cascade,
  rol_scrum text not null default 'desarrollo'
    check (rol_scrum in ('product_owner', 'scrum_master', 'desarrollo', 'asesor')),
  horas_semana numeric(4,1) not null default 12 check (horas_semana >= 0 and horas_semana <= 80),
  -- Fracción de esas horas que cuenta para desarrollo (ej. Scrum Master con
  -- otras responsabilidades = 0.50). 1.00 = todas las horas cuentan.
  factor_dedicacion numeric(3,2) not null default 1.00
    check (factor_dedicacion > 0 and factor_dedicacion <= 1),
  created_at timestamptz not null default now()
);

comment on table scrum_equipo is
  'Miembros del equipo Scrum de Tecnología & Soluciones. Root/CEO tienen acceso siempre; el CTO es el aprobador final por su rol en perfiles.';

-- ---------------------------------------------------------------------
-- 2. Helpers de permisos
-- ---------------------------------------------------------------------
create or replace function fn_scrum_es_miembro() returns boolean as $$
  select coalesce(fn_mi_rol()::text, '') in ('root', 'ceo')
    or exists (select 1 from scrum_equipo where perfil_id = auth.uid());
$$ language sql stable security definer set search_path = public;

create or replace function fn_scrum_es_gestor() returns boolean as $$
  select coalesce(fn_mi_rol()::text, '') in ('root', 'ceo')
    or exists (
      select 1 from scrum_equipo
      where perfil_id = auth.uid() and rol_scrum in ('product_owner', 'scrum_master')
    );
$$ language sql stable security definer set search_path = public;

revoke all on function fn_scrum_es_miembro() from public, anon;
revoke all on function fn_scrum_es_gestor() from public, anon;
grant execute on function fn_scrum_es_miembro() to authenticated;
grant execute on function fn_scrum_es_gestor() to authenticated;

-- ---------------------------------------------------------------------
-- 3. Sprints
-- ---------------------------------------------------------------------
create table sprints (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  objetivo text,
  fecha_inicio date not null,
  fecha_fin date not null,
  estado text not null default 'planificado'
    check (estado in ('planificado', 'activo', 'cerrado')),
  -- Colchón de capacidad reservado para urgencias de clientes.
  colchon_pct integer not null default 20 check (colchon_pct between 0 and 100),
  -- Meta de reparto del tiempo: % para clientes (el resto es interno).
  pct_clientes integer not null default 60 check (pct_clientes between 0 and 100),
  retro_bien text,
  retro_mal text,
  retro_mejorar text,
  creado_por uuid references perfiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sprints_fechas_validas check (fecha_fin >= fecha_inicio)
);

-- Solo un sprint activo a la vez.
create unique index uq_sprint_activo on sprints ((estado)) where estado = 'activo';
create index idx_sprints_estado on sprints(estado);

create trigger trg_sprints_updated_at before update on sprints
  for each row execute function fn_tocar_updated_at();

-- ---------------------------------------------------------------------
-- 4. Product Backlog + tablero (una sola tabla)
-- ---------------------------------------------------------------------
create table scrum_items (
  id uuid primary key default gen_random_uuid(),
  sprint_id uuid references sprints(id) on delete set null,
  titulo text not null,
  descripcion text,
  criterios text,                       -- criterios de aceptación
  tipo text not null default 'historia'
    check (tipo in ('historia', 'tarea', 'bug', 'urgencia')),
  epica text,                           -- ej. "CRM", "Chatbots", "Estrategia"
  cliente_id uuid references clientes(id) on delete set null,  -- null = interno GRESANOVA
  estado text not null default 'backlog'
    check (estado in ('backlog', 'por_hacer', 'en_progreso', 'en_revision', 'hecho')),
  orden integer not null default 0,     -- menor = más prioridad
  horas_estimadas numeric(5,1) check (horas_estimadas is null or horas_estimadas >= 0),
  horas_reales numeric(5,1) check (horas_reales is null or horas_reales >= 0),
  responsable_id uuid references perfiles(id) on delete set null,
  revisor_id uuid references perfiles(id) on delete set null,
  link_pr text,
  bloqueo text,                         -- texto libre si algo lo detiene

  -- Definición de "Terminado"
  dod_probado boolean not null default false,       -- 1. probado en local/preview, no en producción
  dod_pr_revisado boolean not null default false,   -- 2. rama + PR revisado por otra persona
  dod_documentado boolean not null default false,   -- 4. documentado en 3 líneas
  dod_aprobado boolean not null default false,      -- 3. el CTO lo vio funcionando
  documentacion text,

  creado_por uuid references perfiles(id) on delete set null,
  hecho_en timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_scrum_items_sprint on scrum_items(sprint_id);
create index idx_scrum_items_estado on scrum_items(estado);
create index idx_scrum_items_responsable on scrum_items(responsable_id);
create index idx_scrum_items_cliente on scrum_items(cliente_id);
create index idx_scrum_items_orden on scrum_items(orden);

create trigger trg_scrum_items_updated_at before update on scrum_items
  for each row execute function fn_tocar_updated_at();

-- ---------------------------------------------------------------------
-- 5. Reglas del proceso (se aplican siempre, también fuera de la app)
-- ---------------------------------------------------------------------
create or replace function fn_scrum_items_reglas() returns trigger as $$
declare
  v_uid uuid := auth.uid();
  v_aprobador boolean;
  v_gestor boolean;
begin
  -- Con service role (sin sesión) no se restringe: sirve para seeds y mantenimiento.
  v_aprobador := v_uid is null or coalesce(fn_mi_rol()::text, '') in ('root', 'ceo');
  v_gestor := v_aprobador or fn_scrum_es_gestor();

  -- Coherencia entre sprint y estado
  if new.sprint_id is null and new.estado <> 'hecho' then
    new.estado := 'backlog';
  end if;
  if new.sprint_id is not null and new.estado = 'backlog' then
    new.estado := 'por_hacer';
  end if;

  -- 1. Nadie aprueba su propio trabajo
  if new.revisor_id is not null and new.revisor_id = new.responsable_id then
    raise exception 'Nadie aprueba su propio trabajo: el revisor debe ser una persona distinta al responsable.';
  end if;

  -- 2. Requisitos para avanzar
  if new.estado in ('en_progreso', 'en_revision', 'hecho') and new.responsable_id is null then
    raise exception 'Asigna un responsable antes de mover la tarea a "%".', new.estado;
  end if;
  if new.estado in ('en_revision', 'hecho') and new.revisor_id is null then
    raise exception 'Asigna un revisor distinto al responsable antes de pasar a revisión.';
  end if;

  if tg_op = 'UPDATE' then
    -- 4. Solo el revisor (o el CTO) marca el PR como revisado
    if new.dod_pr_revisado is distinct from old.dod_pr_revisado
       and not (v_aprobador or v_uid = new.revisor_id) then
      raise exception 'Solo el revisor asignado (o el CTO) puede marcar el PR como revisado.';
    end if;

    -- El visto bueno del CTO solo lo da Root/CEO
    if new.dod_aprobado is distinct from old.dod_aprobado and not v_aprobador then
      raise exception 'Solo el CTO puede dar el visto bueno final.';
    end if;

    -- 5. Prioridad y sprint los mueven PO / Scrum Master / CTO
    if (new.orden is distinct from old.orden or new.sprint_id is distinct from old.sprint_id)
       and not v_gestor then
      raise exception 'Solo el Product Owner, el Scrum Master o el CTO pueden cambiar la prioridad o el sprint.';
    end if;

    -- Reabrir algo ya terminado: solo el CTO
    if old.estado = 'hecho' and new.estado <> 'hecho' and not v_aprobador then
      raise exception 'Solo el CTO puede reabrir una tarea terminada.';
    end if;
  end if;

  -- 3. Terminado = 4 condiciones cumplidas y aprobación del CTO
  if new.estado = 'hecho' then
    if not v_aprobador then
      raise exception 'Solo el CTO puede marcar una tarea como terminada.';
    end if;
    if not (new.dod_probado and new.dod_pr_revisado and new.dod_documentado and new.dod_aprobado) then
      raise exception 'Faltan condiciones de "Terminado": probado en local/preview, PR revisado, documentado y visto bueno del CTO.';
    end if;
    if new.hecho_en is null then
      new.hecho_en := now();
    end if;
  else
    new.hecho_en := null;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_scrum_items_reglas before insert or update on scrum_items
  for each row execute function fn_scrum_items_reglas();

-- ---------------------------------------------------------------------
-- 6. Daily escrito
-- ---------------------------------------------------------------------
create table scrum_dailies (
  id uuid primary key default gen_random_uuid(),
  sprint_id uuid not null references sprints(id) on delete cascade,
  perfil_id uuid not null references perfiles(id) on delete cascade,
  fecha date not null default current_date,
  ayer text,
  hoy text,
  bloqueos text,
  created_at timestamptz not null default now(),
  unique (sprint_id, perfil_id, fecha)
);

create index idx_scrum_dailies_sprint on scrum_dailies(sprint_id, fecha);

-- ---------------------------------------------------------------------
-- 7. Cerrar sprint: lo no terminado regresa al backlog y se guarda la retro
-- ---------------------------------------------------------------------
create or replace function fn_scrum_cerrar_sprint(
  p_sprint_id uuid,
  p_bien text,
  p_mal text,
  p_mejorar text
) returns void as $$
begin
  if auth.uid() is null or not fn_scrum_es_gestor() then
    raise exception 'Solo el Product Owner, el Scrum Master o el CTO pueden cerrar un sprint.';
  end if;

  update scrum_items
  set sprint_id = null, estado = 'backlog'
  where sprint_id = p_sprint_id and estado <> 'hecho';

  update sprints
  set estado = 'cerrado',
      retro_bien = p_bien,
      retro_mal = p_mal,
      retro_mejorar = p_mejorar
  where id = p_sprint_id;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function fn_scrum_cerrar_sprint(uuid, text, text, text) from public, anon;
grant execute on function fn_scrum_cerrar_sprint(uuid, text, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- 8. RLS
-- ---------------------------------------------------------------------
alter table scrum_equipo enable row level security;
alter table sprints enable row level security;
alter table scrum_items enable row level security;
alter table scrum_dailies enable row level security;

create policy scrum_equipo_select on scrum_equipo for select using (fn_scrum_es_miembro());
create policy scrum_equipo_write on scrum_equipo for all
  using (coalesce(fn_mi_rol()::text, '') in ('root', 'ceo'))
  with check (coalesce(fn_mi_rol()::text, '') in ('root', 'ceo'));

create policy sprints_select on sprints for select using (fn_scrum_es_miembro());
create policy sprints_insert on sprints for insert with check (fn_scrum_es_gestor());
create policy sprints_update on sprints for update using (fn_scrum_es_gestor());
create policy sprints_delete on sprints for delete
  using (coalesce(fn_mi_rol()::text, '') = 'root');

create policy scrum_items_select on scrum_items for select using (fn_scrum_es_miembro());
create policy scrum_items_insert on scrum_items for insert
  with check (fn_scrum_es_miembro() and creado_por = auth.uid());
create policy scrum_items_update on scrum_items for update using (fn_scrum_es_miembro());
create policy scrum_items_delete on scrum_items for delete using (fn_scrum_es_gestor());

create policy scrum_dailies_select on scrum_dailies for select using (fn_scrum_es_miembro());
create policy scrum_dailies_insert on scrum_dailies for insert
  with check (fn_scrum_es_miembro() and perfil_id = auth.uid());
create policy scrum_dailies_update on scrum_dailies for update
  using (perfil_id = auth.uid());

-- ---------------------------------------------------------------------
-- 9. Auditoría y tiempo real
-- ---------------------------------------------------------------------
create trigger trg_audit_scrum_items after insert or update or delete on scrum_items
  for each row execute function fn_audit_trigger();
create trigger trg_audit_sprints after insert or update or delete on sprints
  for each row execute function fn_audit_trigger();

alter publication supabase_realtime add table scrum_items;
alter publication supabase_realtime add table scrum_dailies;
