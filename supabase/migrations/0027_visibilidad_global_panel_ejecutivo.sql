-- Todos los usuarios autenticados pueden consultar clientes y tareas para
-- compartir el panel ejecutivo y la carga operativa. Las politicas de
-- escritura existentes permanecen intactas.
create policy clientes_authenticated_global_select on clientes for select
  using (auth.role() = 'authenticated');

create policy tareas_authenticated_global_select on tareas for select
  using (auth.role() = 'authenticated');