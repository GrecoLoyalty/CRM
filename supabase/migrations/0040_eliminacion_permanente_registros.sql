-- Permite a Root eliminar entradas de la bitácora de clientes.
create policy bitacora_delete_root on cliente_bitacora for delete
  using (fn_mi_rol() = 'root');

-- Al borrar una tarea de una cadena, conserva sus sucesoras sin referencia
-- al registro eliminado.
alter table tareas drop constraint if exists tareas_precede_a_fkey;
alter table tareas add constraint tareas_precede_a_fkey
  foreign key (precede_a) references tareas(id) on delete set null;
