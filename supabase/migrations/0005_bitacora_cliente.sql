-- =====================================================================
-- 0005 — Bitácora compartida del cliente
-- =====================================================================
-- Resuelve el problema de que Estética/Desarrollo no veían lo que
-- Análisis (o cualquier otro depto) había anotado sobre un cliente.
-- Cualquier depto con acceso al cliente puede agregar notas + links de
-- su trabajo, y todos con ese mismo acceso ven el historial completo.
-- =====================================================================

create table cliente_bitacora (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  autor_id uuid references perfiles(id),
  autor_nombre text, -- copia del nombre al momento de escribir, para no depender de un join
  depto depto,
  contenido text not null,
  link text,
  created_at timestamptz not null default now()
);

create index idx_bitacora_cliente on cliente_bitacora(cliente_id, created_at);

-- ---------------------------------------------------------------------
-- Función central: "¿puede este usuario ver este cliente?"
-- Replica la misma lógica que ya usan las políticas de `clientes`,
-- para que la bitácora tenga exactamente la misma visibilidad.
-- ---------------------------------------------------------------------
create or replace function fn_puede_ver_cliente(p_cliente_id uuid)
returns boolean as $$
declare
  v_rol user_role;
begin
  v_rol := fn_mi_rol();

  if v_rol in ('root', 'ceo') then
    return true;
  end if;

  if v_rol = 'analista' then
    return true; -- los analistas ya ven todos los clientes hoy
  end if;

  if v_rol = 'vendedor' then
    return exists(select 1 from clientes where id = p_cliente_id and vendedor_id = auth.uid());
  end if;

  if v_rol = 'produccion' then
    return exists(select 1 from tareas where cliente_id = p_cliente_id and asignado_a = auth.uid());
  end if;

  return false;
end;
$$ language plpgsql stable security definer;

alter table cliente_bitacora enable row level security;

create policy bitacora_select on cliente_bitacora for select
  using (fn_puede_ver_cliente(cliente_id));

create policy bitacora_insert on cliente_bitacora for insert
  with check (fn_puede_ver_cliente(cliente_id) and autor_id = auth.uid());

alter publication supabase_realtime add table cliente_bitacora;
