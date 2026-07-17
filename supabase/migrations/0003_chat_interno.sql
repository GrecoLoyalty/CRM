-- =====================================================================
-- 0003 — Chat interno de equipo (1 a 1 y grupal)
-- =====================================================================
-- Independiente del chat por cliente (chat_mensajes). Este es para que
-- el personal hable entre sí sin amarrarse a un cliente específico.
-- =====================================================================

create table conversaciones (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('directo', 'grupo')),
  nombre text, -- solo aplica para 'grupo'; en 'directo' se muestra el nombre del otro participante
  created_by uuid references perfiles(id),
  created_at timestamptz not null default now()
);

create table conversacion_participantes (
  conversacion_id uuid not null references conversaciones(id) on delete cascade,
  usuario_id uuid not null references perfiles(id) on delete cascade,
  last_read_at timestamptz,
  joined_at timestamptz not null default now(),
  primary key (conversacion_id, usuario_id)
);

create table mensajes_generales (
  id uuid primary key default gen_random_uuid(),
  conversacion_id uuid not null references conversaciones(id) on delete cascade,
  autor_id uuid references perfiles(id),
  contenido text not null,
  created_at timestamptz not null default now()
);

create index idx_msjgen_conversacion on mensajes_generales(conversacion_id, created_at);
create index idx_participantes_usuario on conversacion_participantes(usuario_id);

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table conversaciones enable row level security;
alter table conversacion_participantes enable row level security;
alter table mensajes_generales enable row level security;

create or replace function fn_es_participante(p_conversacion_id uuid)
returns boolean as $$
  select exists(
    select 1 from conversacion_participantes
    where conversacion_id = p_conversacion_id and usuario_id = auth.uid()
  );
$$ language sql stable security definer;

create policy conversaciones_select on conversaciones for select
  using (fn_es_participante(id));
create policy conversaciones_insert on conversaciones for insert
  with check (created_by = auth.uid());

create policy participantes_select on conversacion_participantes for select
  using (fn_es_participante(conversacion_id));
-- Permite agregar participantes si: te agregas a ti mismo (al crear la conversación),
-- o ya eres parte de la conversación (para agregar más gente después).
create policy participantes_insert on conversacion_participantes for insert
  with check (usuario_id = auth.uid() or fn_es_participante(conversacion_id));
create policy participantes_update on conversacion_participantes for update
  using (usuario_id = auth.uid()); -- para actualizar last_read_at propio

create policy mensajes_select on mensajes_generales for select
  using (fn_es_participante(conversacion_id));
create policy mensajes_insert on mensajes_generales for insert
  with check (fn_es_participante(conversacion_id) and autor_id = auth.uid());

alter publication supabase_realtime add table mensajes_generales;
alter publication supabase_realtime add table conversacion_participantes;
