-- =====================================================================
-- 0013 — Link público de invitación para eventos del calendario
-- =====================================================================
-- Cada evento del calendario ahora tiene un token único para compartir
-- por fuera del CRM (WhatsApp, correo, lo que sea). Quien abra el link:
--   1. Ve el detalle del evento (título, fecha, ubicación, descripción,
--      quién organiza y quién más está invitado) sin necesitar cuenta.
--   2. Ve un botón para entrar al sistema y confirmar su asistencia
--      (el RSVP real sigue viviendo dentro del CRM, ya autenticado).
-- =====================================================================

alter table eventos_calendario
  add column link_publico_token uuid not null default gen_random_uuid() unique;

comment on column eventos_calendario.link_publico_token is
  'Token único para el link público de invitación (/evento/[token]). No requiere autenticación para verse; solo expone datos del evento, nunca información sensible de otros clientes/tareas.';

create index idx_eventos_calendario_token on eventos_calendario(link_publico_token);
