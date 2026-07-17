-- =====================================================================
-- 0002 — Solicitudes de acceso auto-registradas
-- =====================================================================
-- Cuando alguien se registra vía /solicitar-acceso (Supabase Auth signUp),
-- este trigger crea automáticamente su fila en `perfiles` con activo=false
-- y sin rol operativo real todavía. Root (o un CEO) la aprueba después
-- asignándole rol/depto/subrol y activándola desde el Panel Root.
-- =====================================================================

-- Guarda el motivo/nota que la persona escribe al solicitar acceso,
-- para que Root tenga contexto al aprobar.
alter table perfiles add column if not exists nota_solicitud text;
alter table perfiles add column if not exists solicitado_at timestamptz default now();

create or replace function fn_crear_perfil_pendiente()
returns trigger as $$
begin
  insert into public.perfiles (id, nombre_completo, role, activo, nota_solicitud)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre_completo', split_part(new.email, '@', 1)),
    'vendedor', -- rol provisional; no otorga acceso real porque activo = false
    false,
    new.raw_user_meta_data->>'nota_solicitud'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_crear_perfil_pendiente on auth.users;
create trigger trg_crear_perfil_pendiente
  after insert on auth.users
  for each row execute function fn_crear_perfil_pendiente();
