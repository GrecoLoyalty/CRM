-- =====================================================================
-- 0023 — Integración con Google (Gmail + Calendar), por usuario
-- =====================================================================
-- Cada persona conecta su PROPIA cuenta de Google (OAuth2). Con eso:
--   1. El CRM puede enviar correos "de parte de" ese usuario vía Gmail
--      (en vez de, o además de, el remitente genérico de Resend).
--   2. Los eventos que cree en el calendario compartido interno se
--      reflejan también en su Google Calendar personal, con invitados.
--
-- El refresh_token es lo único verdaderamente sensible (con él se puede
-- pedir un access_token nuevo indefinidamente), así que se guarda
-- cifrado con pgcrypto — mismo mecanismo que ya usa la Bóveda de
-- contraseñas (fn_vault_set / fn_vault_get), reutilizando VAULT_SECRET_KEY.
-- =====================================================================

create table perfiles_google (
  perfil_id uuid primary key references perfiles(id) on delete cascade,
  email_google text not null,
  refresh_token_enc bytea not null,
  access_token text,
  access_token_expira timestamptz,
  scope text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table perfiles_google is
  'Conexión personal de cada usuario con su cuenta de Google. El refresh_token vive cifrado y solo se descifra server-side (service role) vía fn_google_get_refresh_token. El access_token es de corta duración (~1h) y se refresca solo.';

alter table perfiles_google enable row level security;

-- Cada quien puede ver SI tiene conexión activa y con qué correo (para la
-- pantalla de Integraciones); Root/CEO también pueden verlo para soporte.
-- Nadie puede ver el refresh_token cifrado por RLS normal: solo baja por
-- la función security definer, y solo el backend (service role) la llama.
create policy perfiles_google_select on perfiles_google for select
  using (perfil_id = auth.uid() or fn_mi_rol() in ('root', 'ceo'));

-- Toda escritura (conectar/refrescar/desconectar) pasa por Route Handlers
-- con el cliente de servicio; no hay policy de insert/update/delete para
-- el rol 'authenticated' a propósito.

create trigger trg_perfiles_google_updated_at before update on perfiles_google
  for each row execute function fn_tocar_updated_at();

-- ---------------------------------------------------------------------
-- Funciones para cifrar/descifrar el refresh_token (mismo patrón que la
-- bóveda de contraseñas). security definer porque el rol 'authenticated'
-- no tiene permiso de lectura/escritura directa sobre refresh_token_enc.
-- ---------------------------------------------------------------------
create or replace function fn_google_set_refresh_token(
  p_perfil_id uuid,
  p_refresh_token text,
  p_email text,
  p_scope text,
  p_secret text
) returns void as $$
  insert into perfiles_google (perfil_id, email_google, refresh_token_enc, scope)
  values (p_perfil_id, p_email, pgp_sym_encrypt(p_refresh_token, p_secret), p_scope)
  on conflict (perfil_id) do update
    set email_google = excluded.email_google,
        refresh_token_enc = excluded.refresh_token_enc,
        scope = excluded.scope,
        updated_at = now();
$$ language sql security definer;

create or replace function fn_google_get_refresh_token(p_perfil_id uuid, p_secret text) returns text as $$
  select pgp_sym_decrypt(refresh_token_enc, p_secret)
  from perfiles_google
  where perfil_id = p_perfil_id;
$$ language sql security definer;

revoke all on function fn_google_set_refresh_token(uuid, text, text, text, text) from public;
revoke all on function fn_google_get_refresh_token(uuid, text) from public;

-- ---------------------------------------------------------------------
-- Mapeo con el evento espejo en Google Calendar
-- ---------------------------------------------------------------------
alter table eventos_calendario add column google_event_id text;
alter table eventos_calendario add column google_calendar_perfil_id uuid references perfiles(id) on delete set null;

comment on column eventos_calendario.google_event_id is
  'ID del evento espejo creado en el Google Calendar del organizador (google_calendar_perfil_id), si conectó su cuenta. Null si nunca se sincronizó (p.ej. no tenía Google conectado al crearlo).';
