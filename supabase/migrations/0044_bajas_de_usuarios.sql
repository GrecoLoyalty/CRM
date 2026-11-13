-- =====================================================================
-- 0044 — Bajas de usuarios que ya no aparecen como "solicitud pendiente"
-- =====================================================================
-- Antes, dar de baja a alguien solo ponía perfiles.activo = false, que es
-- exactamente el mismo estado de una solicitud de acceso nueva. Por eso el
-- usuario dado de baja reaparecía en "Solicitudes pendientes".
--
-- Ahora una baja deja marca propia (dado_de_baja_at):
--   activo = false, dado_de_baja_at IS NULL     → solicitud pendiente
--   activo = false, dado_de_baja_at IS NOT NULL → dado de baja (se oculta)
--   activo = true                               → miembro activo
-- =====================================================================

alter table perfiles add column if not exists dado_de_baja_at timestamptz;

comment on column perfiles.dado_de_baja_at is
  'Fecha en que Root dio de baja (o rechazó) a la persona. Mientras tenga valor no cuenta como solicitud pendiente y se oculta del Panel Root.';

-- Un usuario no puede reactivarse a sí mismo editando su propia fila.
create or replace function fn_proteger_rol_perfil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.id = auth.uid()
     and fn_mi_rol() <> 'root'
     and (new.role is distinct from old.role
       or new.depto is distinct from old.depto
       or new.subrol is distinct from old.subrol
       or new.activo is distinct from old.activo
       or new.dado_de_baja_at is distinct from old.dado_de_baja_at) then
    raise exception 'Solo Root puede cambiar roles, departamentos o accesos.';
  end if;
  return new;
end;
$$;

-- Si alguien aprueba o reactiva a una persona, deja de estar "de baja".
create or replace function fn_limpiar_baja_al_activar()
returns trigger
language plpgsql
as $$
begin
  if new.activo is true and old.activo is distinct from true then
    new.dado_de_baja_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_limpiar_baja_al_activar on perfiles;
create trigger trg_limpiar_baja_al_activar before update on perfiles
  for each row execute function fn_limpiar_baja_al_activar();

-- ---------------------------------------------------------------------
-- Limpieza de bajas anteriores (una sola vez, a mano):
-- las personas que diste de baja ANTES de esta migración siguen viéndose
-- como pendientes porque no hay forma de distinguirlas. Entra al Panel Root
-- y pulsa "Rechazar" en cada una (ahora sí se ocultan), o corre esto con
-- los correos reales:
--
--   update perfiles set dado_de_baja_at = now()
--   where activo = false
--     and id in (select id from auth.users where email in ('correo1@...', 'correo2@...'));
-- ---------------------------------------------------------------------
