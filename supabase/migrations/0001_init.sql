-- =====================================================================
-- GRESANOVA OS v1.0 — Esquema inicial de base de datos
-- =====================================================================
-- Ejecutar en el SQL Editor de Supabase, o vía `supabase db push`.
-- Este archivo crea: tipos enum, tablas, RLS, triggers de auditoría
-- y las funciones de lógica de negocio (conversión de prospecto,
-- auto-asignación por carga de trabajo, briefing obligatorio, etc).
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. ENUMS
-- ---------------------------------------------------------------------
create type user_role as enum ('root', 'ceo', 'analista', 'vendedor', 'produccion');
create type produccion_subrol as enum ('camarografo', 'editor', 'community_manager', 'fullstack', 'ia_ml', 'qa');

create type estado_cliente as enum (
  'PROSPECTO', 'TRANSFERIDO', 'EN_ANALISIS', 'EN_PRODUCCION',
  'EN_SUPERVISION', 'ENTREGADO', 'HISTORICO'
);

create type estado_tarea as enum (
  'PENDIENTE', 'EN_PROGRESO', 'BLOQUEADA', 'GRABADO', 'EDICION_LISTA',
  'PUBLICADO', 'COMPLETADA'
);

create type depto as enum ('ventas', 'analisis', 'estetica', 'desarrollo');
create type nivel_urgencia as enum ('informativo', 'importante', 'urgente');
create type accion_auditoria as enum ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'EXPORT', 'VIEW_VAULT');
create type fuente_lead as enum ('referido', 'redes', 'llamada', 'evento', 'otro');
create type presupuesto as enum ('bajo', 'medio', 'alto');

-- ---------------------------------------------------------------------
-- 2. PERFILES DE USUARIO (extiende auth.users de Supabase)
-- ---------------------------------------------------------------------
create table perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre_completo text not null,
  role user_role not null default 'vendedor',
  subrol produccion_subrol, -- solo aplica si role = 'produccion'
  depto depto, -- departamento al que pertenece (null para root/ceo)
  activo boolean not null default true,
  tema jsonb not null default '{"paleta":"claro","tipografia":"Inter"}'::jsonb,
  sonido_notificaciones boolean not null default true,
  avatar_url text,
  created_at timestamptz not null default now()
);

comment on table perfiles is 'Extiende auth.users con rol, departamento y preferencias. El Root asigna roles.';

-- ---------------------------------------------------------------------
-- 3. GIROS / INDUSTRIAS (catálogo configurable sin tocar código)
-- ---------------------------------------------------------------------
create table giros_industria (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  activo boolean not null default true
);

insert into giros_industria (nombre) values
  ('Restaurante'), ('Clínica / Salud'), ('E-commerce'), ('Salón de belleza'),
  ('Bienes raíces'), ('Educación'), ('Retail'), ('Servicios profesionales'), ('Otro');

-- ---------------------------------------------------------------------
-- 4. CLIENTES (entidad central del sistema)
-- ---------------------------------------------------------------------
create table clientes (
  id uuid primary key default gen_random_uuid(),
  cliente_codigo text unique not null default ('CLI-' || to_char(now(), 'YYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6)),

  -- Formulario de captación (Ventas)
  nombre_contacto text not null,
  nombre_empresa text not null,
  giro_id uuid references giros_industria(id),
  telefono text not null,
  email text,
  necesidad_detectada text not null,
  fuente_lead fuente_lead,
  presupuesto_estimado presupuesto,
  foto_url text,

  -- Estado y trazabilidad
  estado estado_cliente not null default 'PROSPECTO',
  vendedor_id uuid references perfiles(id),
  analista_id uuid references perfiles(id),

  -- Formulario de profundidad (llenado externamente por el cliente)
  form_profundidad jsonb,
  form_profundidad_token uuid default gen_random_uuid(),
  form_profundidad_expira timestamptz,

  -- Briefing (Análisis) — obligatorio antes de enviar a producción
  briefing_texto text,
  briefing_archivo_url text,
  ruta_visual boolean not null default false,
  ruta_software boolean not null default false,

  -- Portal público del cliente
  portal_token uuid not null default gen_random_uuid(),
  fecha_entrega_estimada date,

  -- Metadatos
  fecha_cierre timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_clientes_estado on clientes(estado);
create index idx_clientes_vendedor on clientes(vendedor_id);
create index idx_clientes_portal_token on clientes(portal_token);

comment on column clientes.briefing_texto is 'El botón "Enviar a producción" permanece bloqueado hasta que este campo (o el archivo) esté lleno. Validar también en backend.';

-- Historial de duplicados detectados (aviso, no bloqueo automático — configurable por Root)
create table clientes_duplicados_alertas (
  id uuid primary key default gen_random_uuid(),
  cliente_nuevo_id uuid references clientes(id) on delete cascade,
  cliente_existente_id uuid references clientes(id) on delete cascade,
  motivo text, -- ej. 'telefono coincide', 'empresa similar'
  resuelto boolean not null default false,
  created_at timestamptz not null default now()
);

-- Etapas del ciclo de vida (para la línea de tiempo del portal del cliente)
create table clientes_etapas_historial (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  estado estado_cliente not null,
  fecha_estimada date, -- la fecha aproximada que un CEO puede fijar para esta etapa
  fecha_real timestamptz default now(),
  comentario_publico text, -- visible en el portal del cliente
  set_by uuid references perfiles(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 5. TAREAS (unidad de trabajo por departamento — el "Banner de Tarea")
-- ---------------------------------------------------------------------
create table tareas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  depto depto not null,
  subrol_requerido produccion_subrol, -- p.ej. 'camarografo' para la primera tarea de estética
  titulo text not null,
  descripcion text,
  estado estado_tarea not null default 'PENDIENTE',
  asignado_a uuid references perfiles(id),
  asignado_automaticamente boolean not null default true,
  precede_a uuid references tareas(id), -- para cadenas (camarógrafo -> editor -> CM)
  fecha_pactada_entrega date,
  link_entregable text,
  progreso_pct int not null default 0 check (progreso_pct between 0 and 100),

  -- Detección de inactividad (Deteccion de Inactividad *)
  tiempo_total_abierta_seg int not null default 0,
  tiempo_activo_real_seg int not null default 0,
  ultimo_ping_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completada_at timestamptz
);

create index idx_tareas_depto_estado on tareas(depto, estado);
create index idx_tareas_asignado on tareas(asignado_a);
create index idx_tareas_cliente on tareas(cliente_id);

-- ---------------------------------------------------------------------
-- 6. AUDIT TRAIL — INSERT-ONLY, nunca DELETE ni UPDATE
-- ---------------------------------------------------------------------
create table audit_trail (
  id_transaccion uuid primary key default gen_random_uuid(),
  usuario_id uuid references perfiles(id),
  accion accion_auditoria not null,
  objeto text not null, -- 'Cliente', 'Tarea', 'Boveda', etc.
  objeto_id text,
  valor_original jsonb,
  valor_nuevo jsonb,
  ip text,
  timestamp timestamptz not null default now()
);

create index idx_audit_usuario on audit_trail(usuario_id);
create index idx_audit_timestamp on audit_trail(timestamp);

-- Revoca UPDATE/DELETE a nivel de rol de aplicación (ver políticas RLS más abajo también)
revoke update, delete on audit_trail from public;

-- ---------------------------------------------------------------------
-- 7. BÓVEDA DE CONTRASEÑAS (cifrada con pgcrypto, AES-256)
-- ---------------------------------------------------------------------
create table boveda_credenciales (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  servicio text not null, -- 'Instagram', 'Hosting', 'Google Business', etc.
  usuario text not null,
  password_cifrado bytea not null, -- cifrado con pgp_sym_encrypt antes de insertar
  notas text,
  fecha_expiracion date,
  modificado_por uuid references perfiles(id),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table boveda_credenciales is 'Acceso: Root y los 3 CEOs. NUNCA texto plano — cifrado con pgp_sym_encrypt(password, secret) vía función vault_set/vault_get en el backend.';

-- ---------------------------------------------------------------------
-- 8. LIBRERÍA DE LA SUITE (apps reutilizables — DEP 04)
-- ---------------------------------------------------------------------
create table suite_apps (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  categoria_negocio text not null,
  descripcion text,
  captura_url text,
  estado text not null default 'Disponible' check (estado in ('Disponible','En uso','En mantenimiento')),
  repo_url text,
  veces_reutilizada int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 9. CHAT POR CLIENTE
-- ---------------------------------------------------------------------
create table chat_mensajes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  autor_id uuid references perfiles(id),
  es_ceo boolean not null default false,
  contenido text not null,
  leido_por uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_chat_cliente on chat_mensajes(cliente_id, created_at);

-- ---------------------------------------------------------------------
-- 10. BANNERS DE URGENCIA (publicados por CEOs)
-- ---------------------------------------------------------------------
create table banners_urgencia (
  id uuid primary key default gen_random_uuid(),
  autor_id uuid references perfiles(id),
  nivel nivel_urgencia not null,
  mensaje text not null,
  expira_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 11. METAS MENSUALES (Root)
-- ---------------------------------------------------------------------
create table metas_mensuales (
  id uuid primary key default gen_random_uuid(),
  mes date not null unique, -- primer día del mes, ej. 2026-07-01
  facturacion_objetivo numeric(12,2) not null,
  clientes_nuevos_objetivo int not null,
  reseteo_automatico boolean not null default true,
  set_by uuid references perfiles(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 12. NOTIFICACIONES (in-app; el envío push real se conecta después)
-- ---------------------------------------------------------------------
create table notificaciones (
  id uuid primary key default gen_random_uuid(),
  destinatario_id uuid not null references perfiles(id) on delete cascade,
  tipo text not null,
  titulo text not null,
  mensaje text,
  cliente_id uuid references clientes(id),
  leida boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_notif_destinatario on notificaciones(destinatario_id, leida);

-- =====================================================================
-- FUNCIONES DE LÓGICA DE NEGOCIO
-- =====================================================================

-- ---------------------------------------------------------------------
-- A. Auditoría automática vía trigger genérico
-- ---------------------------------------------------------------------
create or replace function fn_audit_trigger() returns trigger as $$
declare
  v_usuario uuid;
begin
  begin
    v_usuario := auth.uid();
  exception when others then
    v_usuario := null;
  end;

  if (tg_op = 'INSERT') then
    insert into audit_trail (usuario_id, accion, objeto, objeto_id, valor_nuevo)
    values (v_usuario, 'CREATE', tg_table_name, new.id::text, to_jsonb(new));
    return new;
  elsif (tg_op = 'UPDATE') then
    insert into audit_trail (usuario_id, accion, objeto, objeto_id, valor_original, valor_nuevo)
    values (v_usuario, 'UPDATE', tg_table_name, new.id::text, to_jsonb(old), to_jsonb(new));
    return new;
  elsif (tg_op = 'DELETE') then
    insert into audit_trail (usuario_id, accion, objeto, objeto_id, valor_original)
    values (v_usuario, 'DELETE', tg_table_name, old.id::text, to_jsonb(old));
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger trg_audit_clientes after insert or update or delete on clientes
  for each row execute function fn_audit_trigger();
create trigger trg_audit_tareas after insert or update or delete on tareas
  for each row execute function fn_audit_trigger();
create trigger trg_audit_boveda after insert or update or delete on boveda_credenciales
  for each row execute function fn_audit_trigger();

-- ---------------------------------------------------------------------
-- B. Auto-asignación por carga de trabajo
--    Elige, dentro del depto (y subrol si aplica), al usuario activo
--    con menos tareas EN_PROGRESO/PENDIENTE actualmente.
-- ---------------------------------------------------------------------
create or replace function fn_auto_asignar(p_depto depto, p_subrol produccion_subrol default null)
returns uuid as $$
declare
  v_usuario uuid;
begin
  select p.id into v_usuario
  from perfiles p
  left join tareas t on t.asignado_a = p.id and t.estado in ('PENDIENTE','EN_PROGRESO','BLOQUEADA')
  where p.role = 'produccion'
    and p.activo = true
    and p.depto = p_depto
    and (p_subrol is null or p.subrol = p_subrol)
  group by p.id
  order by count(t.id) asc, random()
  limit 1;

  return v_usuario;
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------------------
-- C. Conversión de Prospecto → Cliente ("Cerrado / Ganado")
--    Cambia estado, asigna Cliente_ID (ya existe desde creación),
--    lo transfiere a la cola de Análisis y crea notificación.
-- ---------------------------------------------------------------------
create or replace function fn_convertir_prospecto(p_cliente_id uuid)
returns void as $$
declare
  v_analista uuid;
begin
  update clientes
  set estado = 'TRANSFERIDO', fecha_cierre = now(), updated_at = now()
  where id = p_cliente_id and estado = 'PROSPECTO';

  insert into clientes_etapas_historial (cliente_id, estado, comentario_publico)
  values (p_cliente_id, 'TRANSFERIDO', 'Contrato firmado. Tu proyecto pasó al equipo de análisis y estrategia.');

  -- Notificar a todos los analistas activos (el líder de análisis distribuye)
  insert into notificaciones (destinatario_id, tipo, titulo, mensaje, cliente_id)
  select id, 'cliente_transferido', 'Nuevo cliente en Análisis',
         'Un cliente fue transferido y necesita brief estratégico.', p_cliente_id
  from perfiles where role = 'analista' and activo = true;
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------------------
-- D. Envío a producción (bloqueado sin Briefing) — Análisis
--    Crea automáticamente las tareas en Estética y/o Desarrollo
--    según los switches de ruta, con auto-asignación por carga.
-- ---------------------------------------------------------------------
create or replace function fn_enviar_a_produccion(p_cliente_id uuid)
returns void as $$
declare
  v_cliente clientes%rowtype;
  v_asignado uuid;
begin
  select * into v_cliente from clientes where id = p_cliente_id;

  if v_cliente.briefing_texto is null and v_cliente.briefing_archivo_url is null then
    raise exception 'BRIEFING_REQUERIDO: No se puede enviar a producción sin un Briefing adjunto.';
  end if;

  if not v_cliente.ruta_visual and not v_cliente.ruta_software then
    raise exception 'RUTA_REQUERIDA: Debe activarse al menos una ruta (Visual y/o Software).';
  end if;

  update clientes set estado = 'EN_PRODUCCION', updated_at = now() where id = p_cliente_id;

  insert into clientes_etapas_historial (cliente_id, estado, comentario_publico)
  values (p_cliente_id, 'EN_PRODUCCION', 'Tu proyecto está en producción.');

  if v_cliente.ruta_visual then
    v_asignado := fn_auto_asignar('estetica', 'camarografo');
    insert into tareas (cliente_id, depto, subrol_requerido, titulo, descripcion, asignado_a, fecha_pactada_entrega)
    values (p_cliente_id, 'estetica', 'camarografo', 'Grabación de material — ' || v_cliente.nombre_empresa,
            v_cliente.briefing_texto, v_asignado, v_cliente.fecha_entrega_estimada);

    if v_asignado is not null then
      insert into notificaciones (destinatario_id, tipo, titulo, mensaje, cliente_id)
      values (v_asignado, 'tarea_asignada', 'Nueva tarea: Estética Visual', v_cliente.nombre_empresa, p_cliente_id);
    end if;
  end if;

  if v_cliente.ruta_software then
    v_asignado := fn_auto_asignar('desarrollo', 'fullstack');
    insert into tareas (cliente_id, depto, subrol_requerido, titulo, descripcion, asignado_a, fecha_pactada_entrega)
    values (p_cliente_id, 'desarrollo', 'fullstack', 'Desarrollo de software — ' || v_cliente.nombre_empresa,
            v_cliente.briefing_texto, v_asignado, v_cliente.fecha_entrega_estimada);

    if v_asignado is not null then
      insert into notificaciones (destinatario_id, tipo, titulo, mensaje, cliente_id)
      values (v_asignado, 'tarea_asignada', 'Nueva tarea: Desarrollo', v_cliente.nombre_empresa, p_cliente_id);
    end if;
  end if;
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------------------
-- E. Cadena de producción visual: al cambiar estado, crea automáticamente
--    la siguiente tarea de la cadena (Camarógrafo -> Editor -> CM).
-- ---------------------------------------------------------------------
create or replace function fn_avanzar_cadena_estetica() returns trigger as $$
declare
  v_siguiente_subrol produccion_subrol;
  v_titulo text;
  v_asignado uuid;
  v_cliente clientes%rowtype;
begin
  if new.depto <> 'estetica' then
    return new;
  end if;

  select * into v_cliente from clientes where id = new.cliente_id;

  if new.estado = 'GRABADO' and old.estado is distinct from 'GRABADO' then
    v_siguiente_subrol := 'editor';
    v_titulo := 'Edición de material — ' || v_cliente.nombre_empresa;
  elsif new.estado = 'EDICION_LISTA' and old.estado is distinct from 'EDICION_LISTA' then
    v_siguiente_subrol := 'community_manager';
    v_titulo := 'Programar publicación — ' || v_cliente.nombre_empresa;
  elsif new.estado = 'PUBLICADO' and old.estado is distinct from 'PUBLICADO' then
    update clientes set estado = 'EN_SUPERVISION', updated_at = now() where id = new.cliente_id;
    return new;
  else
    return new;
  end if;

  v_asignado := fn_auto_asignar('estetica', v_siguiente_subrol);

  insert into tareas (cliente_id, depto, subrol_requerido, titulo, descripcion, asignado_a, precede_a, fecha_pactada_entrega, link_entregable)
  values (new.cliente_id, 'estetica', v_siguiente_subrol, v_titulo, new.descripcion, v_asignado, new.id, v_cliente.fecha_entrega_estimada, new.link_entregable);

  if v_asignado is not null then
    insert into notificaciones (destinatario_id, tipo, titulo, mensaje, cliente_id)
    values (v_asignado, 'tarea_asignada', v_titulo, 'Tarea disponible en la cadena de estética.', new.cliente_id);
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger trg_cadena_estetica after update on tareas
  for each row execute function fn_avanzar_cadena_estetica();

-- ---------------------------------------------------------------------
-- F. Bóveda: set/get cifrado (AES vía pgcrypto pgp_sym_encrypt)
--    El secreto se pasa desde el backend (env var VAULT_SECRET_KEY),
--    nunca se guarda en la base de datos.
-- ---------------------------------------------------------------------
create or replace function fn_vault_set(
  p_cliente_id uuid, p_servicio text, p_usuario text, p_password text, p_secret text, p_notas text default null
) returns uuid as $$
declare
  v_id uuid;
begin
  insert into boveda_credenciales (cliente_id, servicio, usuario, password_cifrado, notas, modificado_por)
  values (p_cliente_id, p_servicio, p_usuario, pgp_sym_encrypt(p_password, p_secret), p_notas, auth.uid())
  returning id into v_id;
  return v_id;
end;
$$ language plpgsql security definer;

create or replace function fn_vault_get(p_id uuid, p_secret text)
returns text as $$
declare
  v_pass bytea;
  v_result text;
begin
  select password_cifrado into v_pass from boveda_credenciales where id = p_id;
  v_result := pgp_sym_decrypt(v_pass, p_secret);

  insert into audit_trail (usuario_id, accion, objeto, objeto_id)
  values (auth.uid(), 'VIEW_VAULT', 'boveda_credenciales', p_id::text);

  return v_result;
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------------------
-- G. Reseteo automático de metas (llamar vía cron mensual de Supabase,
--    o dejar que Root las cargue manualmente si reseteo_automatico=false)
-- ---------------------------------------------------------------------
create or replace function fn_resetear_metas_si_aplica() returns void as $$
declare
  v_ultima metas_mensuales%rowtype;
  v_mes_actual date := date_trunc('month', now())::date;
begin
  select * into v_ultima from metas_mensuales order by mes desc limit 1;
  if v_ultima.reseteo_automatico and v_ultima.mes < v_mes_actual then
    insert into metas_mensuales (mes, facturacion_objetivo, clientes_nuevos_objetivo, reseteo_automatico, set_by)
    values (v_mes_actual, v_ultima.facturacion_objetivo, v_ultima.clientes_nuevos_objetivo, true, v_ultima.set_by)
    on conflict (mes) do nothing;
  end if;
end;
$$ language plpgsql security definer;

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table perfiles enable row level security;
alter table clientes enable row level security;
alter table clientes_etapas_historial enable row level security;
alter table clientes_duplicados_alertas enable row level security;
alter table tareas enable row level security;
alter table audit_trail enable row level security;
alter table boveda_credenciales enable row level security;
alter table suite_apps enable row level security;
alter table chat_mensajes enable row level security;
alter table banners_urgencia enable row level security;
alter table metas_mensuales enable row level security;
alter table notificaciones enable row level security;
alter table giros_industria enable row level security;

-- Helper: rol del usuario autenticado actual
create or replace function fn_mi_rol() returns user_role as $$
  select role from perfiles where id = auth.uid();
$$ language sql stable security definer;

create or replace function fn_mi_depto() returns depto as $$
  select depto from perfiles where id = auth.uid();
$$ language sql stable security definer;

-- perfiles: todos los usuarios autenticados pueden leer perfiles activos (para chat, asignación); solo Root edita roles.
create policy perfiles_select on perfiles for select using (auth.role() = 'authenticated');
create policy perfiles_update_self on perfiles for update using (auth.uid() = id);
create policy perfiles_root_all on perfiles for all using (fn_mi_rol() = 'root');

-- giros_industria: lectura para todos, escritura solo root
create policy giros_select on giros_industria for select using (auth.role() = 'authenticated');
create policy giros_root_write on giros_industria for all using (fn_mi_rol() = 'root');

-- clientes: Root/CEO ven todo. Vendedor solo los propios. Analista/Producción solo asignados a ellos o a su depto.
create policy clientes_root_ceo on clientes for all
  using (fn_mi_rol() in ('root','ceo'));
create policy clientes_vendedor on clientes for select
  using (fn_mi_rol() = 'vendedor' and vendedor_id = auth.uid());
create policy clientes_vendedor_insert on clientes for insert
  with check (fn_mi_rol() = 'vendedor');
create policy clientes_vendedor_update on clientes for update
  using (fn_mi_rol() = 'vendedor' and vendedor_id = auth.uid() and estado = 'PROSPECTO');
create policy clientes_analista on clientes for select
  using (fn_mi_rol() = 'analista');
create policy clientes_analista_update on clientes for update
  using (fn_mi_rol() = 'analista' and estado in ('TRANSFERIDO','EN_ANALISIS'));
create policy clientes_produccion on clientes for select
  using (fn_mi_rol() = 'produccion' and id in (select cliente_id from tareas where asignado_a = auth.uid()));

-- portal público: acceso por token vía función RPC (bypass RLS con security definer), no política directa.

-- clientes_etapas_historial: mismos lectores que clientes; solo root/ceo/analista escriben
create policy etapas_select on clientes_etapas_historial for select using (auth.role() = 'authenticated');
create policy etapas_write on clientes_etapas_historial for insert with check (fn_mi_rol() in ('root','ceo','analista'));

create policy dup_alertas_select on clientes_duplicados_alertas for select using (fn_mi_rol() in ('root','ceo','vendedor'));

-- tareas: Root/CEO ven todo. Producción/Analista solo lo asignado o de su depto.
create policy tareas_root_ceo on tareas for all using (fn_mi_rol() in ('root','ceo'));
create policy tareas_propias_select on tareas for select
  using (asignado_a = auth.uid() or fn_mi_depto() = depto);
create policy tareas_propias_update on tareas for update
  using (asignado_a = auth.uid() or fn_mi_rol() = 'analista');

-- audit_trail: solo Root escribe libremente (vía trigger security definer); Root lee todo, CEO solo lectura.
create policy audit_root_select on audit_trail for select using (fn_mi_rol() in ('root','ceo'));
create policy audit_insert_system on audit_trail for insert with check (true); -- inserciones vienen de triggers/backend

-- boveda_credenciales: solo Root y CEOs
create policy boveda_root_ceo on boveda_credenciales for all using (fn_mi_rol() in ('root','ceo'));

-- suite_apps: lectura para desarrollo/root/ceo, escritura para desarrollo/root
create policy suite_select on suite_apps for select using (fn_mi_rol() in ('root','ceo','produccion'));
create policy suite_write on suite_apps for all using (fn_mi_rol() in ('root','produccion'));

-- chat_mensajes: participantes del cliente (asignados) + root/ceo siempre
create policy chat_select on chat_mensajes for select
  using (fn_mi_rol() in ('root','ceo') or cliente_id in (select cliente_id from tareas where asignado_a = auth.uid())
         or cliente_id in (select id from clientes where vendedor_id = auth.uid() or analista_id = auth.uid()));
create policy chat_insert on chat_mensajes for insert
  with check (fn_mi_rol() in ('root','ceo') or cliente_id in (select cliente_id from tareas where asignado_a = auth.uid())
         or cliente_id in (select id from clientes where vendedor_id = auth.uid() or analista_id = auth.uid()));

-- banners_urgencia: lectura para todos autenticados; escritura root/ceo
create policy banners_select on banners_urgencia for select using (auth.role() = 'authenticated');
create policy banners_write on banners_urgencia for insert with check (fn_mi_rol() in ('root','ceo'));

-- metas_mensuales: lectura para todos (barra global); escritura solo root
create policy metas_select on metas_mensuales for select using (auth.role() = 'authenticated');
create policy metas_write on metas_mensuales for all using (fn_mi_rol() = 'root');

-- notificaciones: cada quien ve las suyas
create policy notif_select on notificaciones for select using (destinatario_id = auth.uid());
create policy notif_update on notificaciones for update using (destinatario_id = auth.uid());

-- =====================================================================
-- REALTIME (chat y tareas en vivo)
-- =====================================================================
alter publication supabase_realtime add table chat_mensajes;
alter publication supabase_realtime add table tareas;
alter publication supabase_realtime add table notificaciones;
alter publication supabase_realtime add table banners_urgencia;
