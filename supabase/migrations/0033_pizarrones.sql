create table pizarrones (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (char_length(titulo) between 1 and 100),
  elementos jsonb not null default '[]'::jsonb,
  conexiones jsonb not null default '[]'::jsonb,
  creado_por uuid not null references perfiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_pizarrones_creado_por on pizarrones(creado_por);
create trigger trg_pizarrones_updated_at before update on pizarrones
  for each row execute function fn_tocar_updated_at();

alter table pizarrones enable row level security;

create policy pizarrones_select on pizarrones for select
  using (auth.role() = 'authenticated');

create policy pizarrones_insert on pizarrones for insert
  with check (creado_por = auth.uid());

create policy pizarrones_update on pizarrones for update
  using (creado_por = auth.uid() or fn_mi_rol() in ('root', 'ceo'))
  with check (creado_por = auth.uid() or fn_mi_rol() in ('root', 'ceo'));

create policy pizarrones_delete on pizarrones for delete
  using (creado_por = auth.uid() or fn_mi_rol() in ('root', 'ceo'));
