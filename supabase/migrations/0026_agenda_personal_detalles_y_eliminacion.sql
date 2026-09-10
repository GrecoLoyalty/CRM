-- =====================================================================
-- 0026 - Agenda personal con detalles y limpieza de FKs de perfiles
-- =====================================================================

alter table agenda_personal
  add column if not exists notas text,
  add column if not exists ubicacion text,
  add column if not exists alguien_ira_conmigo text,
  add column if not exists recordatorio text;

create index if not exists idx_agenda_personal_rango on agenda_personal(fecha_inicio, fecha_fin);
create index if not exists idx_agenda_personal_perfil on agenda_personal(perfil_id);

-- Arreglo de seguridad para perfiles creados después de la migración 0021:
-- si la base de datos ya tiene FKs a perfiles(id) sin acción ON DELETE,
-- fuerza un SET NULL idempotente para evitar que la eliminación del usuario
-- falle por una restricción NO ACTION creada en una tabla nueva o posterior.
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
      and array_length(con.conkey, 1) = 1
      and con.confdeltype = 'a'
  loop
    if r.es_not_null then
      execute format('alter table %I.%I alter column %I drop not null;', r.schema_name, r.table_name, r.column_name);
    end if;

    execute format('alter table %I.%I drop constraint %I;', r.schema_name, r.table_name, r.conname);
    execute format(
      'alter table %I.%I add constraint %I foreign key (%I) references perfiles(id) on delete set null;',
      r.schema_name, r.table_name, r.conname, r.column_name
    );
  end loop;
end $$;
