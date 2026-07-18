-- =====================================================================
-- 0009 — Tareas internas, tiempo de uso por persona y flujo de caja
-- =====================================================================
-- Problemas resueltos:
--   1) Root/CEO no podían asignar una tarea "suelta" (no ligada a ningún
--      cliente) a un trabajador — ej. una tarea administrativa, una
--      capacitación, algo interno. `tareas.cliente_id` era obligatorio.
--      Ahora es opcional: una tarea puede o no estar ligada a un cliente.
--   2) Se agregan 3 fuentes de datos para las estadísticas que debe ver
--      todo el equipo:
--        a) tiempo_uso_diario — segundos activos por persona por día,
--           para la gráfica de barras "tiempo dentro del CRM".
--        b) movimientos_caja — cada ingreso/egreso que Root/CEO registra
--           manualmente desde un banner. Con esto se arman DOS gráficas:
--           - Ventas: suma de ingresos con categoria='venta' por período.
--           - Flujo de caja: balance acumulado (ingresos - egresos).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tareas sin cliente (tareas internas / secundarias)
-- ---------------------------------------------------------------------
alter table tareas alter column cliente_id drop not null;

alter table tareas add column origen text not null default 'automatico'
  check (origen in ('automatico', 'manual'));

comment on column tareas.cliente_id is
  'Puede ser NULL: una tarea interna/secundaria (administrativa, capacitación, etc.) no siempre está ligada a un cliente.';
comment on column tareas.origen is
  '"automatico" = generada por el flujo normal (briefing, cadena de estética, etc). "manual" = creada directamente por Root/CEO para asignar trabajo suelto a alguien.';

-- ---------------------------------------------------------------------
-- 2. TIEMPO_USO_DIARIO — cuánto tiempo pasa cada persona en el CRM
-- ---------------------------------------------------------------------
create table tiempo_uso_diario (
  perfil_id uuid not null references perfiles(id) on delete cascade,
  fecha date not null default current_date,
  segundos_activos int not null default 0,
  ultimo_ping timestamptz,
  primary key (perfil_id, fecha)
);

comment on table tiempo_uso_diario is
  'Segundos de actividad real (con mouse/teclado, no solo pestaña abierta) por persona y por día, acumulados vía ping cada 60s igual que el sistema de detección de inactividad de tareas. Alimenta la gráfica de barras de tiempo en el CRM, visible para todos.';

create index idx_tiempo_uso_fecha on tiempo_uso_diario(fecha);

alter table tiempo_uso_diario enable row level security;

-- Todos ven las estadísticas de todos (la gráfica es de equipo, no privada).
create policy tiempo_uso_select on tiempo_uso_diario for select
  using (auth.role() = 'authenticated');

-- Cada quien solo puede escribir/incrementar su propia fila (el backend
-- calcula el delta real entre pings, tope 60s por ping, igual que tareas).
create policy tiempo_uso_propio_write on tiempo_uso_diario for all
  using (perfil_id = auth.uid())
  with check (perfil_id = auth.uid());

-- Root puede corregir manualmente si hace falta.
create policy tiempo_uso_root_write on tiempo_uso_diario for all
  using (fn_mi_rol() = 'root');

-- ---------------------------------------------------------------------
-- 3. MOVIMIENTOS_CAJA — el banner de ingresos/egresos de Root/CEO
-- ---------------------------------------------------------------------
create table movimientos_caja (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('ingreso', 'egreso')),
  categoria text not null default 'otro',
  concepto text not null,
  monto numeric(12,2) not null check (monto > 0),
  cliente_id uuid references clientes(id) on delete set null,
  fecha date not null default current_date,
  registrado_por uuid references perfiles(id),
  created_at timestamptz not null default now()
);

comment on table movimientos_caja is
  'Ingresos y egresos reales de la empresa, capturados a mano por Root/CEO desde un banner. tipo=ingreso + categoria=venta alimenta la gráfica de ventas; todos los movimientos juntos (balance acumulado) alimentan la gráfica de flujo de caja. Lectura para todo el equipo, escritura solo Root/CEO.';

create index idx_movimientos_caja_fecha on movimientos_caja(fecha);
create index idx_movimientos_caja_tipo on movimientos_caja(tipo, categoria);
create index idx_movimientos_caja_cliente on movimientos_caja(cliente_id);

alter table movimientos_caja enable row level security;

create policy movimientos_caja_select on movimientos_caja for select
  using (auth.role() = 'authenticated');

create policy movimientos_caja_root_ceo_write on movimientos_caja for all
  using (fn_mi_rol() in ('root', 'ceo'));

create trigger trg_audit_movimientos_caja after insert or update or delete on movimientos_caja
  for each row execute function fn_audit_trigger();

-- =====================================================================
-- REALTIME
-- =====================================================================
alter publication supabase_realtime add table movimientos_caja;
alter publication supabase_realtime add table tiempo_uso_diario;
