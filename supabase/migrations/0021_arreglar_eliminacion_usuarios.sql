-- =====================================================================
-- 0021 — Arregla la eliminación de usuarios (Root → Gestión de roles)
-- =====================================================================
-- PROBLEMA:
--   eliminarUsuario() usa admin.auth.admin.deleteUser(perfilId). Como
--   perfiles.id → auth.users(id) ON DELETE CASCADE, borrar el usuario de
--   Auth debería arrastrar su fila en `perfiles`. El problema es que
--   muchas otras tablas (clientes.vendedor_id, tareas.asignado_a,
--   cliente_bitacora.autor_id, materiales_cliente.subido_por, etc.)
--   referencian perfiles(id) SIN especificar ON DELETE, lo que en
--   Postgres por defecto es "NO ACTION" (equivalente a RESTRICT):
--   en cuanto la persona a eliminar tiene UN solo registro relacionado
--   en cualquiera de esas tablas (un cliente asignado, una tarea, un
--   comentario, un archivo subido...), Postgres rechaza el DELETE con
--   "violates foreign key constraint", lo cual sube como un error sin
--   manejar hasta el Server Component ("An error occurred in the Server
--   Components render...").
--
-- SOLUCIÓN:
--   Recorremos automáticamente TODAS las foreign keys que apuntan a
--   perfiles(id) y que actualmente no tienen acción ON DELETE definida,
--   y las cambiamos a ON DELETE SET NULL (preservando el historial: el
--   registro se queda, solo se limpia la referencia a la persona
--   eliminada). Si la columna era NOT NULL, la volvemos nullable para
--   poder aplicar el SET NULL. No se toca ninguna FK que ya tenga una
--   acción explícita (por ejemplo, las que ya usan ON DELETE CASCADE a
--   propósito, como ticket_comentarios o notificaciones).
-- =====================================================================

do $$
declare
  r record;
begin
  for r in
    select
      con.conname,
      ns.nspname as schema_name,
      cl.relname as table_name,
      att.attname as column_name,
      att.attnotnull as es_not_null
    from pg_constraint con
    join pg_class cl on cl.oid = con.conrelid
    join pg_namespace ns on ns.oid = cl.relnamespace
    join pg_attribute att
      on att.attrelid = con.conrelid
     and att.attnum = con.conkey[1]
    where con.contype = 'f'
      and con.confrelid = 'public.perfiles'::regclass
      and array_length(con.conkey, 1) = 1 -- solo FKs de una sola columna
      and con.confdeltype = 'a' -- 'a' = NO ACTION (sin especificar), el bug
  loop
    if r.es_not_null then
      execute format('alter table %I.%I alter column %I drop not null;', r.schema_name, r.table_name, r.column_name);
      raise notice 'Columna % en % vuelta nullable para permitir SET NULL', r.column_name, r.table_name;
    end if;

    execute format('alter table %I.%I drop constraint %I;', r.schema_name, r.table_name, r.conname);
    execute format(
      'alter table %I.%I add constraint %I foreign key (%I) references perfiles(id) on delete set null;',
      r.schema_name, r.table_name, r.conname, r.column_name
    );
    raise notice 'FK %.% (%) ahora es ON DELETE SET NULL', r.table_name, r.column_name, r.conname;
  end loop;
end $$;
