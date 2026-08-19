-- =====================================================================
-- 0022 — Reasegura las políticas RLS de tickets
-- =====================================================================
-- El código de crearTicket() ya hace todo bien (manda creado_por =
-- auth.uid(), que es exactamente lo que pide la política tickets_insert
-- de la migración 0014). Si en producción sigue saliendo
-- "new row violates row-level security policy for table tickets", lo
-- más probable es que la migración 0014 no terminó de aplicarse
-- completa en tu proyecto de Supabase (por ejemplo, si se pegó el SQL
-- a mano en el editor y algo truncó el script a medias): la tabla y el
-- RLS quedaron activos, pero falta alguna política — y con RLS activado
-- y sin política de INSERT, Postgres rechaza CUALQUIER inserción, sin
-- importar quién la haga.
--
-- Este archivo vuelve a crear (drop if exists + create) las mismas
-- políticas de 0014, así que es seguro correrlo aunque ya existan.
-- =====================================================================

drop policy if exists tickets_select on tickets;
drop policy if exists tickets_insert on tickets;
drop policy if exists tickets_update on tickets;
drop policy if exists tickets_delete on tickets;
drop policy if exists ticket_destinatarios_select on ticket_destinatarios;
drop policy if exists ticket_destinatarios_write on ticket_destinatarios;
drop policy if exists ticket_comentarios_select on ticket_comentarios;
drop policy if exists ticket_comentarios_insert on ticket_comentarios;

create policy tickets_select on tickets for select using (fn_puede_ver_ticket(id));
create policy tickets_insert on tickets for insert with check (creado_por = auth.uid());
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

-- ---------------------------------------------------------------------
-- Diagnóstico rápido: corre esto en el SQL Editor de Supabase para ver
-- qué políticas quedaron activas en las 3 tablas de tickets.
-- ---------------------------------------------------------------------
-- select tablename, policyname, cmd from pg_policies
-- where tablename in ('tickets', 'ticket_destinatarios', 'ticket_comentarios');
