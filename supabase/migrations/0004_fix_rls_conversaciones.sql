-- =====================================================================
-- 0004 — Corrige RLS de conversaciones (bug de "huevo y gallina")
-- =====================================================================
-- Al crear una conversación, Supabase intenta leerla de vuelta en el
-- mismo request (para confirmar el insert). La política original solo
-- dejaba leer conversaciones donde ya eres participante — pero en ese
-- instante el creador todavía no se ha agregado a sí mismo. Esto
-- causaba un 403 Forbidden al crear cualquier chat nuevo.
-- =====================================================================

drop policy if exists conversaciones_select on conversaciones;

create policy conversaciones_select on conversaciones for select
  using (fn_es_participante(id) or created_by = auth.uid());
