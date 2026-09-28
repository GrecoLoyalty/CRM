create table empresa_configuracion (
  id text primary key default 'principal' check (id = 'principal'),
  nombre_empresa text not null,
  giro text,
  telefono text,
  correo text,
  sitio_web text,
  direccion text,
  moneda text not null default 'MXN' check (moneda in ('MXN', 'USD', 'EUR')),
  costos_fijos_mensuales numeric(12,2) not null default 0 check (costos_fijos_mensuales >= 0),
  costos_variables_pct numeric(5,2) not null default 0 check (costos_variables_pct >= 0 and costos_variables_pct < 100),
  tasa_impuestos_pct numeric(5,2) not null default 0 check (tasa_impuestos_pct >= 0 and tasa_impuestos_pct <= 100),
  updated_by uuid references perfiles(id),
  updated_at timestamptz not null default now()
);

alter table empresa_configuracion enable row level security;

create policy empresa_configuracion_root_select on empresa_configuracion for select
  using (fn_mi_rol() = 'root');

create policy empresa_configuracion_root_write on empresa_configuracion for all
  using (fn_mi_rol() = 'root')
  with check (fn_mi_rol() = 'root');