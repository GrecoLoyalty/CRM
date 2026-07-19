-- =====================================================================
-- 0012 — Una sola fuente de verdad: cliente_equipo siempre sincronizado
-- =====================================================================
-- Problema resuelto:
--   Terminamos con DOS sistemas independientes para "quién atiende a un
--   cliente": las columnas clientes.vendedor_id / clientes.analista_id
--   (el encargado "principal"), y la tabla cliente_equipo (equipo multi-
--   persona). Nada mantenía sincronizados a ambos, así que dependiendo
--   de qué pantalla usaras para asignar a alguien, esa persona podía:
--     - Aparecer como "principal" pero NO en la lista del equipo (el
--       checklist de Panel Root → Clientes no la mostraba marcada).
--     - Tener una tarea de Estética/Desarrollo asignada, pero no
--       aparecer en el equipo del cliente tampoco.
--     - Cambiar de vendedor/analista principal y el anterior seguir
--       "fantasma" en el equipo, o el nuevo no aparecer ahí.
--
-- La solución: 3 triggers que mantienen cliente_equipo sincronizada
-- automáticamente, sin importar desde qué acción/pantalla se toque
-- vendedor_id, analista_id o una tarea. cliente_equipo pasa a ser la
-- única fuente de verdad real; vendedor_id/analista_id siguen existiendo
-- solo como el "principal" dentro de ese equipo.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Cuando se asigna/cambia el vendedor o analista principal de un
--    cliente, esa persona queda también en cliente_equipo automáticamente.
-- ---------------------------------------------------------------------
create or replace function fn_sincronizar_equipo_desde_cliente() returns trigger as $$
begin
  if new.vendedor_id is not null then
    insert into cliente_equipo (cliente_id, depto, perfil_id)
    values (new.id, 'ventas', new.vendedor_id)
    on conflict do nothing;
  end if;
  if new.analista_id is not null then
    insert into cliente_equipo (cliente_id, depto, perfil_id)
    values (new.id, 'analisis', new.analista_id)
    on conflict do nothing;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sincronizar_equipo_desde_cliente on clientes;
create trigger trg_sincronizar_equipo_desde_cliente
  after insert or update of vendedor_id, analista_id on clientes
  for each row execute function fn_sincronizar_equipo_desde_cliente();

comment on function fn_sincronizar_equipo_desde_cliente() is
  'Cada vez que se define/cambia el vendedor o analista principal de un cliente (desde cualquier pantalla o acción), esa persona queda reflejada también en cliente_equipo — así nunca aparece "principal" en un lado y ausente del equipo en otro.';

-- ---------------------------------------------------------------------
-- 2. Cuando a alguien se le asigna una tarea de un cliente (Estética,
--    Desarrollo, la que sea), queda también en el equipo de ese cliente
--    para ese departamento — así el checklist de Panel Root refleja la
--    realidad de quién ya está trabajando en él.
-- ---------------------------------------------------------------------
create or replace function fn_sincronizar_equipo_desde_tarea() returns trigger as $$
begin
  if new.asignado_a is not null and new.cliente_id is not null then
    insert into cliente_equipo (cliente_id, depto, perfil_id)
    values (new.cliente_id, new.depto, new.asignado_a)
    on conflict do nothing;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sincronizar_equipo_desde_tarea on tareas;
create trigger trg_sincronizar_equipo_desde_tarea
  after insert or update of asignado_a on tareas
  for each row execute function fn_sincronizar_equipo_desde_tarea();

comment on function fn_sincronizar_equipo_desde_tarea() is
  'Cada vez que a alguien se le asigna una tarea de un cliente, queda reflejado en cliente_equipo para ese departamento. No se elimina automáticamente si la tarea se reasigna a otra persona (se conserva el historial de quién ha trabajado en el cliente); quitarlo de la vista es una acción explícita desde Panel Root → Clientes.';

-- ---------------------------------------------------------------------
-- 3. Backfill de seguridad: corrige cualquier desajuste que ya exista
--    hoy entre vendedor_id/analista_id/tareas y cliente_equipo.
-- ---------------------------------------------------------------------
insert into cliente_equipo (cliente_id, depto, perfil_id)
select id, 'ventas', vendedor_id from clientes where vendedor_id is not null
on conflict do nothing;

insert into cliente_equipo (cliente_id, depto, perfil_id)
select id, 'analisis', analista_id from clientes where analista_id is not null
on conflict do nothing;

insert into cliente_equipo (cliente_id, depto, perfil_id)
select distinct cliente_id, depto, asignado_a from tareas
where asignado_a is not null and cliente_id is not null
on conflict do nothing;
