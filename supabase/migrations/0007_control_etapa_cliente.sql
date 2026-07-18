-- =====================================================================
-- 0007 — Control de etapa/departamento del cliente
-- =====================================================================
-- Problema resuelto:
--   1) No existía una forma de que Root (o los encargados de un cliente)
--      movieran manualmente a un cliente entre etapas/departamentos
--      (mantenerlo, retrocederlo o avanzarlo). Solo existían automatismos
--      (fn_convertir_prospecto, fn_enviar_a_produccion, cadena de estética).
--   2) No había una forma explícita de saber "quién es encargado" de un
--      cliente para poder darle ese permiso de forma segura.
--
-- Esta migración agrega:
--   - fn_es_encargado_cliente: ¿el usuario actual es vendedor, analista o
--     tiene una tarea asignada para este cliente?
--   - fn_orden_estado: posición numérica de cada estado en el pipeline,
--     para permitir solo saltos de una etapa a la vez a los no-Root/CEO.
--   - fn_cambiar_estado_cliente: RPC que hace el cambio real, validando
--     permisos y dejando registro en clientes_etapas_historial (bitácora
--     de auditoría que ya alimenta el portal del cliente).
-- =====================================================================

create or replace function fn_es_encargado_cliente(p_cliente_id uuid) returns boolean as $$
  select exists (
    select 1 from clientes
    where id = p_cliente_id
      and (vendedor_id = auth.uid() or analista_id = auth.uid())
  )
  or exists (
    select 1 from tareas
    where cliente_id = p_cliente_id and asignado_a = auth.uid()
  );
$$ language sql stable security definer;

comment on function fn_es_encargado_cliente(uuid) is
  'True si el usuario autenticado es vendedor/analista asignado del cliente, o tiene al menos una tarea asignada para él (encargado de producción).';

create or replace function fn_orden_estado(p_estado estado_cliente) returns int as $$
  select case p_estado
    when 'PROSPECTO'      then 1
    when 'TRANSFERIDO'    then 2
    when 'EN_ANALISIS'    then 3
    when 'EN_PRODUCCION'  then 4
    when 'EN_SUPERVISION' then 5
    when 'ENTREGADO'      then 6
    when 'HISTORICO'      then 7
  end;
$$ language sql immutable;

create or replace function fn_cambiar_estado_cliente(
  p_cliente_id uuid,
  p_nuevo_estado estado_cliente,
  p_comentario text default null
) returns void as $$
declare
  v_rol user_role;
  v_estado_actual estado_cliente;
begin
  select role into v_rol from perfiles where id = auth.uid();
  select estado into v_estado_actual from clientes where id = p_cliente_id;

  if v_estado_actual is null then
    raise exception 'CLIENTE_NO_ENCONTRADO';
  end if;

  -- Root/CEO pueden mover al cliente a cualquier etapa (poder de veto/gestión).
  -- Cualquier otro usuario debe ser encargado del cliente y solo puede
  -- avanzar o retroceder UNA etapa a la vez (no saltarse el flujo).
  if v_rol not in ('root', 'ceo') then
    if not fn_es_encargado_cliente(p_cliente_id) then
      raise exception 'SIN_PERMISO: No eres encargado de este cliente.';
    end if;
    if abs(fn_orden_estado(p_nuevo_estado) - fn_orden_estado(v_estado_actual)) > 1 then
      raise exception 'SALTO_NO_PERMITIDO: Solo puedes avanzar o retroceder una etapa a la vez.';
    end if;
  end if;

  if p_nuevo_estado = v_estado_actual then
    return; -- "Mantener": no hay nada que cambiar.
  end if;

  update clientes set estado = p_nuevo_estado, updated_at = now() where id = p_cliente_id;

  insert into clientes_etapas_historial (cliente_id, estado, comentario_publico, set_by)
  values (
    p_cliente_id,
    p_nuevo_estado,
    coalesce(nullif(trim(p_comentario), ''), 'Etapa actualizada manualmente.'),
    auth.uid()
  );
end;
$$ language plpgsql security definer;

comment on function fn_cambiar_estado_cliente(uuid, estado_cliente, text) is
  'Mueve a un cliente entre etapas/departamentos. Root/CEO: libre. Encargados (vendedor, analista o quien tenga una tarea asignada): solo un paso adelante o atrás.';
