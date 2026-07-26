-- =====================================================================
-- 0018 — Ficha visible temporalmente en el portal + avisos por cliente
-- =====================================================================
-- 1. Root/CEO puede activar/desactivar, por cliente y cuando quiera, que
--    ese cliente vea su propia ficha (PDF resumen) desde su portal. Es un
--    interruptor manual — por defecto está apagado, así que "ver la
--    ficha" es algo que tú prendes temporalmente, no algo permanente.
-- 2. Un banner de avisos POR CLIENTE, aparte del comentario de etapa que
--    ya existía — con nivel de urgencia (mismo esquema de colores que ya
--    usas para los banners internos del equipo: informativo/importante/
--    urgente) y expiración opcional.
-- =====================================================================

alter table clientes add column mostrar_ficha_portal boolean not null default false;

comment on column clientes.mostrar_ficha_portal is
  'Si está en true, el cliente ve un botón en su portal para ver/descargar un resumen de su ficha en PDF. Lo prende y apaga Root/CEO manualmente por cliente — pensado para dejarlo activo solo temporalmente.';

-- ---------------------------------------------------------------------
-- Avisos del portal — el "banner extra" que pidió, separado del
-- comentario_publico de la etapa actual.
-- ---------------------------------------------------------------------
create table portal_avisos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  mensaje text not null,
  nivel nivel_urgencia not null default 'informativo',
  activo boolean not null default true,
  creado_por uuid references perfiles(id),
  created_at timestamptz not null default now(),
  expira_at timestamptz
);

comment on table portal_avisos is
  'Avisos que Root/CEO le dejan a un cliente específico en su portal, aparte del comentario de etapa. Se colorea según nivel (mismo esquema que banners_urgencia interno) y puede expirar solo o desactivarse a mano.';

create index idx_portal_avisos_cliente on portal_avisos(cliente_id, activo);

alter table portal_avisos enable row level security;

create policy portal_avisos_select on portal_avisos for select using (auth.role() = 'authenticated');
create policy portal_avisos_write on portal_avisos for all using (fn_mi_rol() in ('root', 'ceo'));

alter publication supabase_realtime add table portal_avisos;
