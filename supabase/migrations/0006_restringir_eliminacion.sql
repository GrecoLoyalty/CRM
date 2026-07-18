-- =====================================================================
-- 0006 — Restringe DELETE de clientes/tareas solo a Root
-- =====================================================================
-- El blueprint es explícito: "Eliminar clientes o tareas" → Root SÍ,
-- CEO NO. Las políticas originales usaban "for all" (select+insert+
-- update+delete juntos) para root Y ceo, lo cual sin querer también
-- dejaba borrar a los CEOs. Aquí se separa: Root y CEO comparten
-- lectura/escritura, pero el DELETE queda exclusivo de Root.
-- =====================================================================

-- --- CLIENTES ---
drop policy if exists clientes_root_ceo on clientes;

create policy clientes_root_ceo_select on clientes for select
  using (fn_mi_rol() in ('root', 'ceo'));
create policy clientes_root_ceo_insert on clientes for insert
  with check (fn_mi_rol() in ('root', 'ceo'));
create policy clientes_root_ceo_update on clientes for update
  using (fn_mi_rol() in ('root', 'ceo'));
create policy clientes_root_delete on clientes for delete
  using (fn_mi_rol() = 'root');

-- --- TAREAS --- (mismo criterio, para ser consistentes con el blueprint)
drop policy if exists tareas_root_ceo on tareas;

create policy tareas_root_ceo_select on tareas for select
  using (fn_mi_rol() in ('root', 'ceo'));
create policy tareas_root_ceo_insert on tareas for insert
  with check (fn_mi_rol() in ('root', 'ceo'));
create policy tareas_root_ceo_update on tareas for update
  using (fn_mi_rol() in ('root', 'ceo'));
create policy tareas_root_delete on tareas for delete
  using (fn_mi_rol() = 'root');
