-- =====================================================================
-- 0025 - Agenda personal y disponibilidad del equipo
-- =====================================================================

create table agenda_personal (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references perfiles(id) on delete cascade,
  titulo text not null,
  fecha_inicio timestamptz not null,
  fecha_fin timestamptz not null,
  estado text not null default 'ocupado' check (estado in ('ocupado', 'disponible')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agenda_personal_fechas_validas check (fecha_fin > fecha_inicio)
);

create index idx_agenda_personal_rango on agenda_personal(fecha_inicio, fecha_fin);
create index idx_agenda_personal_perfil on agenda_personal(perfil_id);

create trigger trg_agenda_personal_updated_at
before update on agenda_personal
for each row execute function fn_tocar_updated_at();

alter table agenda_personal enable row level security;

create policy agenda_personal_select on agenda_personal
for select using (auth.role() = 'authenticated');

create policy agenda_personal_insert on agenda_personal
for insert with check (perfil_id = auth.uid());

create policy agenda_personal_update on agenda_personal
for update using (perfil_id = auth.uid() or fn_mi_rol() in ('root', 'ceo'))
with check (perfil_id = auth.uid() or fn_mi_rol() in ('root', 'ceo'));

create policy agenda_personal_delete on agenda_personal
for delete using (perfil_id = auth.uid() or fn_mi_rol() in ('root', 'ceo'));

alter publication supabase_realtime add table agenda_personal;