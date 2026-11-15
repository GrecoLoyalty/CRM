-- =====================================================================
-- 0046 — Varias cuentas de pago para el ticket de preventas (carrusel)
-- Reemplaza los campos bancarios únicos de preventas_config. Esos campos
-- se conservan (no se borran) y la cuenta existente se copia aquí.
-- =====================================================================
create table preventas_cuentas (
  id uuid primary key default gen_random_uuid(),
  etiqueta text,                         -- ej. "Transferencia BBVA"
  banco text not null,
  titular text not null,                 -- nombre completo del responsable
  clabe text check (clabe is null or clabe ~ '^[0-9]{18}$'),
  numero_cuenta text,
  activa boolean not null default true,
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  constraint chk_cuenta_dato check (clabe is not null or numero_cuenta is not null)
);

insert into preventas_cuentas (banco, titular, clabe, numero_cuenta)
select coalesce(nullif(banco,''), 'Banco'), coalesce(nullif(titular,''), 'Sin titular'),
       nullif(clabe,''), nullif(numero_cuenta,'')
from preventas_config
where nullif(clabe,'') is not null or nullif(numero_cuenta,'') is not null;

alter table preventas_cuentas enable row level security;

create policy preventas_cuentas_select on preventas_cuentas for select
  using (fn_mi_rol() in ('root','ceo','vendedor'));
create policy preventas_cuentas_root_write on preventas_cuentas for all
  using (fn_mi_rol() = 'root') with check (fn_mi_rol() = 'root');

create trigger trg_audit_preventas_cuentas after insert or update or delete on preventas_cuentas
  for each row execute function fn_audit_trigger();
