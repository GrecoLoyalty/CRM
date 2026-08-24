-- =====================================================================
-- 0024 — Función de diagnóstico TEMPORAL: ¿qué ve Postgres como auth.uid()?
-- =====================================================================
-- Solo para investigar el error "new row violates row-level security
-- policy for table tickets" cuando la política y el perfil ya se
-- confirmaron correctos. Esta función deja ver, desde dentro de la
-- propia petición autenticada de la app (no desde el SQL Editor, que
-- corre como superusuario y no sirve para esto), qué valor de
-- auth.uid() está llegando realmente al hacer el insert.
--
-- Se puede borrar en cuanto se resuelva el diagnóstico:
--   drop function if exists fn_debug_auth_uid();
-- =====================================================================
create or replace function fn_debug_auth_uid() returns jsonb as $$
  select jsonb_build_object(
    'auth_uid', auth.uid(),
    'auth_role', auth.role(),
    'jwt_sub', auth.jwt() ->> 'sub',
    'jwt_email', auth.jwt() ->> 'email'
  );
$$ language sql stable security definer;

grant execute on function fn_debug_auth_uid() to authenticated;
