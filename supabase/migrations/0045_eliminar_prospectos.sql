-- Permite que Root o el vendedor responsable eliminen prospectos,
-- sin ampliar el permiso para borrar clientes que ya avanzaron de etapa.
create policy clientes_delete_prospectos on clientes for delete
  using (
    estado = 'PROSPECTO'
    and (
      fn_mi_rol() = 'root'
      or (fn_mi_rol() = 'vendedor' and vendedor_id = auth.uid())
    )
  );

-- Conserva las notificaciones al borrar un prospecto, desligándolas
-- del cliente eliminado en lugar de bloquear el borrado.
alter table notificaciones
  drop constraint if exists notificaciones_cliente_id_fkey;
alter table notificaciones
  add constraint notificaciones_cliente_id_fkey
  foreign key (cliente_id) references clientes(id) on delete set null;
