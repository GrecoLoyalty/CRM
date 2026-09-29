-- Ensure ticket creators can read rows returned by INSERT ... RETURNING.
-- This matches the creator access already intended by fn_puede_ver_ticket.
drop policy if exists tickets_select_creador on public.tickets;

create policy tickets_select_creador on public.tickets
  for select
  using (creado_por = auth.uid());