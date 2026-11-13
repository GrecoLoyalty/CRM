-- =====================================================================
-- 0043 — Se quita el módulo Scrum
-- =====================================================================
-- El equipo trabaja con una sola línea: Ventas → Análisis → Estética /
-- Desarrollo, más "Mis tareas" y Tickets. Scrum duplicaba el seguimiento
-- de trabajo, así que se elimina junto con sus reglas y datos.
-- Es seguro correrla aunque 0042 nunca se haya aplicado.
-- =====================================================================

drop table if exists scrum_dailies cascade;
drop table if exists scrum_items cascade;
drop table if exists sprints cascade;
drop table if exists scrum_equipo cascade;

drop function if exists fn_scrum_cerrar_sprint(uuid, text, text, text);
drop function if exists fn_scrum_items_reglas();
drop function if exists fn_scrum_es_gestor();
drop function if exists fn_scrum_es_miembro();
