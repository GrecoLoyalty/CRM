-- =====================================================================
-- 0011 — Sincronizar automáticamente el depto principal de cada persona
-- =====================================================================
-- Problema resuelto:
--   La migración 0008 copió el depto principal de cada persona a
--   `perfiles_departamentos` UNA SOLA VEZ (backfill), pero no dejó nada
--   que mantuviera esa copia al día. Resultado: cualquier persona
--   aprobada DESPUÉS de esa migración, o a quien Root le cambiara su
--   depto principal desde "Roles y permisos", no aparecía en
--   `perfiles_departamentos` — y como la pantalla de "Clientes" arma la
--   lista de "quién pertenece a qué depto" leyendo esa tabla, esa
--   persona simplemente no aparecía como opción para asignarla a un
--   cliente, aunque su depto principal estuviera bien puesto.
--
-- Esta migración agrega un trigger que mantiene `perfiles_departamentos`
-- sincronizada automáticamente cada vez que se crea una persona o se le
-- cambia el depto principal, y vuelve a correr el backfill por si acaso
-- quedó alguien sin sincronizar entre medio.
-- =====================================================================

create or replace function fn_sincronizar_depto_principal() returns trigger as $$
begin
  if new.depto is not null then
    insert into perfiles_departamentos (perfil_id, depto)
    values (new.id, new.depto)
    on conflict do nothing;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sincronizar_depto_principal on perfiles;
create trigger trg_sincronizar_depto_principal
  after insert or update of depto on perfiles
  for each row execute function fn_sincronizar_depto_principal();

comment on function fn_sincronizar_depto_principal() is
  'Cada vez que se crea una persona o se le asigna/cambia su depto principal, se refleja automáticamente en perfiles_departamentos — así nunca desaparece de las listas de asignación de clientes.';

-- Backfill de seguridad, por si quedó alguien sin sincronizar entre la
-- migración 0008 y esta.
insert into perfiles_departamentos (perfil_id, depto)
select id, depto from perfiles where depto is not null
on conflict do nothing;
