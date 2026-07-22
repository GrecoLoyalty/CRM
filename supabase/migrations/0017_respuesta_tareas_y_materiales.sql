-- =====================================================================
-- 0017 — Seguimiento de respuesta en tareas (visto/confirmado/en proceso/
-- finalizado) + historial rastreable + concatenación a materiales del cliente
-- =====================================================================
-- Problema resuelto:
--   Al asignar una tarea (sobre todo las manuales de Root/CEO), quien la
--   recibía solo podía "anexar un link" y saltar directo a completada —
--   sin poder comunicar "ya la vi", "la confirmo", "estoy trabajando en
--   ella". Y quien la asignó no tenía dónde ver ese link ni el progreso;
--   solo el binario completada/no completada.
--
-- Esta migración agrega:
--   1. tareas.respuesta_estado — el ciclo de respuesta de quien la recibe
--      (sin_responder → visto → confirmado → en_proceso → finalizado),
--      independiente del `estado` de la cadena de producción (que sigue
--      funcionando exactamente igual para Estética/Desarrollo).
--   2. tareas.creado_por — quién asignó la tarea (antes no se guardaba),
--      para que Root/CEO puedan rastrear específicamente "lo que yo asigné".
--   3. tarea_respuesta_historial — bitácora de cada cambio de respuesta,
--      con quién lo hizo, cuándo, y el link/comentario de ese momento.
--   4. materiales_cliente ahora también acepta materiales tipo "link"
--      (no solo archivos subidos), para que cuando una tarea ligada a un
--      cliente se finalice con un link, quede concatenado automáticamente
--      al expediente de ese cliente.
-- =====================================================================

alter table tareas add column respuesta_estado text not null default 'sin_responder'
  check (respuesta_estado in ('sin_responder', 'visto', 'confirmado', 'en_proceso', 'finalizado'));

alter table tareas add column creado_por uuid references perfiles(id);

comment on column tareas.respuesta_estado is
  'Ciclo de respuesta de quien recibe la tarea, independiente del estado de la cadena de producción. Lo actualiza quien tiene asignado_a = su propio id.';
comment on column tareas.creado_por is
  'Quién asignó la tarea (solo se llena en tareas manuales, origen=manual). Las automáticas de la cadena de producción no tienen "asignador" humano.';

-- ---------------------------------------------------------------------
-- Historial de respuesta — para que Root/CEO puedan rastrear cada cambio
-- ---------------------------------------------------------------------
create table tarea_respuesta_historial (
  id uuid primary key default gen_random_uuid(),
  tarea_id uuid not null references tareas(id) on delete cascade,
  perfil_id uuid not null references perfiles(id),
  respuesta_estado text not null check (respuesta_estado in ('sin_responder', 'visto', 'confirmado', 'en_proceso', 'finalizado')),
  comentario text,
  link_entregable text,
  created_at timestamptz not null default now()
);

comment on table tarea_respuesta_historial is
  'Cada cambio de respuesta_estado de una tarea queda registrado aquí — así quien la asignó puede ver la línea de tiempo completa (visto → confirmado → en_proceso → finalizado), no solo el estado actual.';

create index idx_tarea_respuesta_historial_tarea on tarea_respuesta_historial(tarea_id, created_at);

alter table tarea_respuesta_historial enable row level security;

create policy tarea_respuesta_historial_select on tarea_respuesta_historial for select
  using (
    fn_mi_rol() in ('root', 'ceo')
    or exists (
      select 1 from tareas t
      where t.id = tarea_id
        and (t.asignado_a = auth.uid() or t.creado_por = auth.uid() or t.depto = any(fn_mis_deptos()))
    )
  );

create policy tarea_respuesta_historial_insert on tarea_respuesta_historial for insert
  with check (
    perfil_id = auth.uid()
    and exists (select 1 from tareas t where t.id = tarea_id and t.asignado_a = auth.uid())
  );

alter publication supabase_realtime add table tarea_respuesta_historial;

-- ---------------------------------------------------------------------
-- Materiales del cliente: ahora también aceptan un "link" en vez de un
-- archivo subido (para el entregable final de una tarea).
-- ---------------------------------------------------------------------
alter table materiales_cliente alter column storage_path drop not null;
alter table materiales_cliente add column link_url text;
alter table materiales_cliente add column tarea_id uuid references tareas(id) on delete set null;

alter table materiales_cliente add constraint materiales_cliente_origen_valido
  check (storage_path is not null or link_url is not null);

comment on column materiales_cliente.link_url is
  'Alternativa a storage_path: un link externo (Drive, WeTransfer, etc.) en vez de un archivo subido al bucket. Se usa sobre todo cuando el entregable de una tarea ligada a un cliente se concatena automáticamente aquí.';
