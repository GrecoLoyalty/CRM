-- =====================================================================
-- 0045 — División de venta de productos: PREVENTAS
--
-- Flujo:
--   1. La gente de campo (rol vendedor) da de alta una preventa con los
--      datos del cliente. Hay dos caminos:
--        a) Ya recibió el anticipo  -> anticipo_pagado = true
--        b) Aún no pagó             -> anticipo_pagado = false; el ticket
--           del cliente le muestra los datos bancarios y el monto.
--   2. Cada preventa genera un link público (ticket_token) tipo "ticket"
--      que el cliente abre sin login.
--   3. El avance de "cuánto falta para el envío" es GLOBAL (igual para
--      todos los clientes) y lo gestiona solo Root (tabla
--      preventas_config + preventas_actualizaciones).
--
-- Se mantiene separado de la tabla `clientes` (servicios) a propósito:
-- son flujos distintos y así no se mezclan etapas, tareas ni metas.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Configuración global (una sola fila): avance + datos bancarios
-- ---------------------------------------------------------------------
create table preventas_config (
  id text primary key default 'principal' check (id = 'principal'),

  -- Avance global que ven TODOS los clientes en su ticket
  etapa_actual smallint not null default 1 check (etapa_actual between 1 and 5),
  fecha_estimada_envio date,
  mensaje_general text,

  -- Datos para pago por transferencia (se muestran solo si NO ha pagado)
  banco text,
  titular text,
  clabe text,
  numero_cuenta text,
  instrucciones_pago text,

  updated_by uuid references perfiles(id),
  updated_at timestamptz not null default now()
);

insert into preventas_config (id) values ('principal');

-- ---------------------------------------------------------------------
-- Historial de actualizaciones globales (lo que se ve como "novedades"
-- en el ticket). Root las publica a mano.
-- ---------------------------------------------------------------------
create table preventas_actualizaciones (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  mensaje text,
  publicada boolean not null default true,
  creado_por uuid references perfiles(id),
  created_at timestamptz not null default now()
);

create index idx_preventas_act_created on preventas_actualizaciones(created_at desc);

-- ---------------------------------------------------------------------
-- Preventas (una por cliente/venta)
-- ---------------------------------------------------------------------
create sequence preventas_folio_seq start 1001;

create table preventas (
  id uuid primary key default gen_random_uuid(),
  folio text not null unique default ('PV-' || nextval('preventas_folio_seq')),
  ticket_token uuid not null unique default gen_random_uuid(),

  -- Datos del cliente (todos obligatorios salvo notas)
  nombre_cliente text not null,
  nombre_negocio text not null,
  telefono text not null,
  email text not null,
  direccion text not null,

  -- Venta
  producto text not null,
  cantidad integer not null default 1 check (cantidad > 0),
  monto_total numeric(12,2) not null check (monto_total >= 0),
  monto_anticipo numeric(12,2) not null check (monto_anticipo >= 0),
  notas text,

  -- Pago del anticipo
  anticipo_pagado boolean not null default false,
  pago_metodo text check (pago_metodo in ('efectivo','transferencia','otro')),
  pago_fecha timestamptz,
  pago_registrado_por uuid references perfiles(id),

  estado text not null default 'activa' check (estado in ('activa','enviada','entregada','cancelada')),

  vendedor_id uuid not null references perfiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint chk_anticipo_no_mayor check (monto_anticipo <= monto_total),
  constraint chk_pago_coherente check (anticipo_pagado = false or pago_metodo is not null)
);

create index idx_preventas_vendedor on preventas(vendedor_id);
create index idx_preventas_token on preventas(ticket_token);
create index idx_preventas_telefono on preventas(telefono);

create or replace function fn_preventas_updated_at() returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create trigger trg_preventas_updated_at before update on preventas
  for each row execute function fn_preventas_updated_at();

-- Auditoría (reusa el trigger genérico del sistema)
create trigger trg_audit_preventas after insert or update or delete on preventas
  for each row execute function fn_audit_trigger();

-- ---------------------------------------------------------------------
-- RLS
--   root/ceo  : ven y gestionan todo
--   vendedor  : ve y crea SOLO sus preventas; no puede borrar ni cambiar
--               un pago ya confirmado (eso lo hace Root)
--   El cliente final NO usa RLS: entra por /ticket/[token] vía service role
-- ---------------------------------------------------------------------
alter table preventas enable row level security;
alter table preventas_config enable row level security;
alter table preventas_actualizaciones enable row level security;

create policy preventas_root_ceo_all on preventas for all
  using (fn_mi_rol() in ('root','ceo'))
  with check (fn_mi_rol() in ('root','ceo'));

create policy preventas_vendedor_select on preventas for select
  using (fn_mi_rol() = 'vendedor' and vendedor_id = auth.uid());

create policy preventas_vendedor_insert on preventas for insert
  with check (fn_mi_rol() = 'vendedor' and vendedor_id = auth.uid());

-- Config: root escribe; root/ceo/vendedor leen (el vendedor necesita los
-- datos bancarios para pasárselos al cliente si no paga en el momento).
create policy preventas_config_select on preventas_config for select
  using (fn_mi_rol() in ('root','ceo','vendedor'));

create policy preventas_config_root_write on preventas_config for all
  using (fn_mi_rol() = 'root')
  with check (fn_mi_rol() = 'root');

create policy preventas_act_select on preventas_actualizaciones for select
  using (fn_mi_rol() in ('root','ceo','vendedor'));

create policy preventas_act_root_write on preventas_actualizaciones for all
  using (fn_mi_rol() = 'root')
  with check (fn_mi_rol() = 'root');
