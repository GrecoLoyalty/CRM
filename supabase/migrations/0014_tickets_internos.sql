-- =====================================================================
-- 0014 — Tickets internos (departamento o personas puntuales)
-- =====================================================================
-- Cualquier persona del equipo puede levantar un ticket detallado:
--   - Dirigido a un DEPARTAMENTO completo (lo puede tomar cualquiera de ahí), o
--   - Dirigido a una o varias PERSONAS puntuales.
--   - Opcionalmente ligado a un cliente (para dar contexto de a quién afecta).
-- Tiene hilo de comentarios y ciclo de vida: abierto → en_progreso →
-- resuelto → cerrado.
-- =====================================================================

create table tickets (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descripcion text,
  prioridad text not null default 'media' check (prioridad in ('baja', 'media', 'alta', 'urgente')),
  estado text not null default 'abierto' check (estado in ('abierto', 'en_progreso', 'resuelto', 'cerrado')),
  cliente_id uuid references clientes(id) on delete set null,
  depto_destino depto,
  asignado_a uuid references perfiles(id) on delete set null,
  creado_por uuid not null references perfiles(id) on delete cascade,
  resuelto_por uuid references perfiles(id),
  resuelto_en timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table tickets is
  'Tickets internos entre equipo: se dirigen a un departamento completo (depto_destino) y/o a personas puntuales (ticket_destinatarios). asignado_a es quien ya lo tomó y está trabajando en él. Se puede ligar opcionalmente a un cliente.';

create index idx_tickets_depto on tickets(depto_destino);
create index idx_tickets_asignado on tickets(asignado_a);
create index idx_tickets_cliente on tickets(cliente_id);
create index idx_tickets_estado on tickets(estado);
create index idx_tickets_creado_por on tickets(creado_por);

create trigger trg_tickets_updated_at before update on tickets
  for each row execute function fn_tocar_updated_at();

-- ---------------------------------------------------------------------
-- Destinatarios puntuales (cuando el ticket es para personas específicas,
-- no para todo un departamento — puede haber varias).
-- ---------------------------------------------------------------------
create table ticket_destinatarios (
  ticket_id uuid not null references tickets(id) on delete cascade,
  perfil_id uuid not null references perfiles(id) on delete cascade,
  primary key (ticket_id, perfil_id)
);

-- ---------------------------------------------------------------------
-- Hilo de comentarios de cada ticket
-- ---------------------------------------------------------------------
create table ticket_comentarios (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  autor_id uuid not null references perfiles(id) on delete cascade,
  mensaje text not null,
  created_at timestamptz not null default now()
);

create index idx_ticket_comentarios_ticket on ticket_comentarios(ticket_id);

-- ---------------------------------------------------------------------
-- ¿Puede este usuario ver/participar en este ticket? — helper reusado
-- por las 3 tablas para no repetir la misma lógica de acceso 3 veces.
-- ---------------------------------------------------------------------
create or replace function fn_puede_ver_ticket(p_ticket_id uuid) returns boolean as $$
  select exists (
    select 1 from tickets t
    where t.id = p_ticket_id
      and (
        t.creado_por = auth.uid()
        or t.asignado_a = auth.uid()
        or (t.depto_destino is not null and t.depto_destino = any(fn_mis_deptos()))
        or fn_mi_rol() in ('root', 'ceo')
        or exists (select 1 from ticket_destinatarios d where d.ticket_id = t.id and d.perfil_id = auth.uid())
      )
  );
$$ language sql stable security definer;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table tickets enable row level security;
alter table ticket_destinatarios enable row level security;
alter table ticket_comentarios enable row level security;

create policy tickets_select on tickets for select using (fn_puede_ver_ticket(id));
create policy tickets_insert on tickets for insert with check (creado_por = auth.uid());
-- Cualquiera que pueda ver el ticket puede tomarlo/actualizar su estado —
-- así cualquier persona del departamento destino puede resolverlo, no
-- solo quien ya está asignado.
create policy tickets_update on tickets for update using (fn_puede_ver_ticket(id));
create policy tickets_delete on tickets for delete
  using (fn_mi_rol() = 'root' or (creado_por = auth.uid() and estado = 'abierto'));

create policy ticket_destinatarios_select on ticket_destinatarios for select using (fn_puede_ver_ticket(ticket_id));
create policy ticket_destinatarios_write on ticket_destinatarios for all
  using (
    fn_mi_rol() in ('root', 'ceo')
    or exists (select 1 from tickets t where t.id = ticket_id and t.creado_por = auth.uid())
  );

create policy ticket_comentarios_select on ticket_comentarios for select using (fn_puede_ver_ticket(ticket_id));
create policy ticket_comentarios_insert on ticket_comentarios for insert
  with check (autor_id = auth.uid() and fn_puede_ver_ticket(ticket_id));

-- =====================================================================
-- REALTIME
-- =====================================================================
alter publication supabase_realtime add table tickets;
alter publication supabase_realtime add table ticket_destinatarios;
alter publication supabase_realtime add table ticket_comentarios;
