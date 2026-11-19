create table public.agenda_personal_asistentes (
  titular_id uuid primary key references public.perfiles(id) on delete cascade,
  asistente_id uuid not null references public.perfiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint agenda_personal_asistentes_distintos check (titular_id <> asistente_id)
);

create index idx_agenda_personal_asistentes_asistente
  on public.agenda_personal_asistentes(asistente_id);

alter table public.agenda_personal_asistentes enable row level security;

create policy agenda_personal_asistentes_select
  on public.agenda_personal_asistentes
  for select
  using (titular_id = auth.uid() or asistente_id = auth.uid());

create policy agenda_personal_asistentes_insert
  on public.agenda_personal_asistentes
  for insert
  with check (titular_id = auth.uid() and titular_id <> asistente_id);

create policy agenda_personal_asistentes_update
  on public.agenda_personal_asistentes
  for update
  using (titular_id = auth.uid())
  with check (titular_id = auth.uid() and titular_id <> asistente_id);

create policy agenda_personal_asistentes_delete
  on public.agenda_personal_asistentes
  for delete
  using (titular_id = auth.uid());

drop policy if exists agenda_personal_select on public.agenda_personal;
create policy agenda_personal_select
  on public.agenda_personal
  for select
  using (
    perfil_id = auth.uid()
    or estado = 'disponible'
    or fn_mi_rol() in ('root', 'ceo')
    or exists (
      select 1
      from public.agenda_personal_asistentes a
      where a.titular_id = agenda_personal.perfil_id
        and a.asistente_id = auth.uid()
    )
  );

drop policy if exists agenda_personal_insert on public.agenda_personal;
create policy agenda_personal_insert
  on public.agenda_personal
  for insert
  with check (
    perfil_id = auth.uid()
    or exists (
      select 1
      from public.agenda_personal_asistentes a
      where a.titular_id = agenda_personal.perfil_id
        and a.asistente_id = auth.uid()
    )
  );

drop policy if exists agenda_personal_update on public.agenda_personal;
create policy agenda_personal_update
  on public.agenda_personal
  for update
  using (
    perfil_id = auth.uid()
    or fn_mi_rol() in ('root', 'ceo')
    or exists (
      select 1
      from public.agenda_personal_asistentes a
      where a.titular_id = agenda_personal.perfil_id
        and a.asistente_id = auth.uid()
    )
  )
  with check (
    perfil_id = auth.uid()
    or fn_mi_rol() in ('root', 'ceo')
    or exists (
      select 1
      from public.agenda_personal_asistentes a
      where a.titular_id = agenda_personal.perfil_id
        and a.asistente_id = auth.uid()
    )
  );

drop policy if exists agenda_personal_delete on public.agenda_personal;
create policy agenda_personal_delete
  on public.agenda_personal
  for delete
  using (
    perfil_id = auth.uid()
    or fn_mi_rol() in ('root', 'ceo')
    or exists (
      select 1
      from public.agenda_personal_asistentes a
      where a.titular_id = agenda_personal.perfil_id
        and a.asistente_id = auth.uid()
    )
  );
