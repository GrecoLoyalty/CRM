-- =====================================================================
-- Seed OPCIONAL del módulo Scrum — Tecnología & Soluciones
-- =====================================================================
-- Correr DESPUÉS de 0042_scrum.sql, en el SQL Editor de Supabase.
-- Es idempotente: se puede correr varias veces sin duplicar.
--
-- Busca a las personas por nombre en la tabla `perfiles` (no distingue
-- mayúsculas ni acentos exactos: usa ILIKE con un fragmento del nombre).
-- Si alguien aún no tiene cuenta, esa fila se omite y su responsable
-- queda vacío; puedes asignarlo después desde el tablero.
--
-- Ajusta los fragmentos de nombre si en `perfiles` se escriben distinto.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Equipo Scrum
-- ---------------------------------------------------------------------
insert into scrum_equipo (perfil_id, rol_scrum, horas_semana, factor_dedicacion)
select id, 'product_owner', 13, 1.00 from perfiles where nombre_completo ilike '%arath%' limit 1
on conflict (perfil_id) do nothing;

insert into scrum_equipo (perfil_id, rol_scrum, horas_semana, factor_dedicacion)
select id, 'scrum_master', 13, 0.50 from perfiles where nombre_completo ilike 'braulio%' limit 1
on conflict (perfil_id) do nothing;

insert into scrum_equipo (perfil_id, rol_scrum, horas_semana, factor_dedicacion)
select id, 'desarrollo', 13, 1.00 from perfiles where nombre_completo ilike 'axel%' limit 1
on conflict (perfil_id) do nothing;

insert into scrum_equipo (perfil_id, rol_scrum, horas_semana, factor_dedicacion)
select id, 'desarrollo', 13, 1.00 from perfiles where nombre_completo ilike 'francisco%' limit 1
on conflict (perfil_id) do nothing;

insert into scrum_equipo (perfil_id, rol_scrum, horas_semana, factor_dedicacion)
select id, 'asesor', 2, 1.00 from perfiles where nombre_completo ilike 'sebasti%' limit 1
on conflict (perfil_id) do nothing;

-- ---------------------------------------------------------------------
-- 2. Sprint 0: jueves 29 oct → lunes 2 nov 2026
-- ---------------------------------------------------------------------
insert into sprints (nombre, objetivo, fecha_inicio, fecha_fin, estado, colchon_pct, pct_clientes)
select
  'Sprint 0',
  'El lunes 2 mostramos el CRM de cocoeco y el de Smitt-Dent funcionando, y la estrategia estándar de marketing lista para presentarse.',
  date '2026-10-29', date '2026-11-02', 'activo', 20, 60
where not exists (select 1 from sprints where nombre = 'Sprint 0');

-- ---------------------------------------------------------------------
-- 3. Backlog. orden: menor = más prioridad.
--    Los de Sprint 0 entran directo al sprint; el resto queda en backlog.
-- ---------------------------------------------------------------------
with
  s0 as (select id from sprints where nombre = 'Sprint 0' limit 1),
  p_axel as (select id from perfiles where nombre_completo ilike 'axel%' limit 1),
  p_fran as (select id from perfiles where nombre_completo ilike 'francisco%' limit 1),
  p_brau as (select id from perfiles where nombre_completo ilike 'braulio%' limit 1),
  p_arat as (select id from perfiles where nombre_completo ilike '%arath%' limit 1),
  items (orden, titulo, tipo, epica, en_sprint0, resp, rev, horas, criterios) as (
    values
    -- ---- Sprint 0 ----
    (10, 'Corregir fallas de contratos en el CRM de Smitt-Dent', 'bug', 'CRM clientes', true, 'fran', 'brau', 8.0,
        'Los contratos se generan, se editan y se ven correctamente. Probado en preview antes de producción.'),
    (20, 'Corregir usuarios, roles y permisos en el CRM de cocoeco', 'bug', 'CRM clientes', true, 'axel', 'brau', 8.0,
        'Cada rol ve y hace solo lo que le corresponde. Probado con un usuario de cada rol.'),
    (30, 'Ambiente de pruebas: previews de Vercel + proyecto Supabase de pruebas', 'tarea', 'Procesos', true, 'brau', null, 4.0,
        'Cada rama genera un preview y apunta a una base de datos de pruebas, no a producción.'),
    (40, 'Plantilla estándar de estrategia de marketing', 'historia', 'Estrategia', true, 'arat', null, 6.0,
        'Diagnóstico, buyer persona, embudo, calendario de contenido, métricas y reporte mensual.'),
    (50, 'Primera estrategia de cocoeco y Smitt-Dent con la plantilla estándar', 'historia', 'Estrategia', true, 'arat', null, 6.0,
        'Un documento por cliente, explicado de forma sencilla, listo para presentarse el lunes 2.'),
    (60, 'Formulario-blueprint de pet-plus', 'historia', 'CRM clientes', true, 'arat', 'brau', 4.0,
        'El formulario captura todo lo necesario para armar el CRM de pet-plus.'),
    -- ---- Backlog (Sprint 1 en adelante) ----
    (100, 'Cierre y estabilización de cocoeco y Smitt-Dent', 'historia', 'CRM clientes', false, null, null, null,
        'Lo que quede pendiente del Sprint 0, sin fallas abiertas.'),
    (110, 'Construir el CRM de pet-plus', 'historia', 'CRM clientes', false, null, null, null,
        'CRM funcional según el blueprint, partiendo de la plantilla base.'),
    (120, 'Estrategia de ventas y marketing: pet-plus', 'historia', 'Estrategia', false, null, null, null,
        'Estrategia entregada con la plantilla estándar.'),
    (130, 'Estrategia de ventas y marketing: fressia', 'historia', 'Estrategia', false, null, null, null,
        'Estrategia entregada con la plantilla estándar.'),
    (140, 'Chatbot de WhatsApp (OpenWA + Claude + DigitalOcean): piloto interno', 'historia', 'Chatbots', false, null, null, null,
        'El bot responde por WhatsApp en un número interno de pruebas.'),
    (150, 'Chatbot de WhatsApp para cocoeco', 'historia', 'Chatbots', false, null, null, null, null),
    (160, 'Chatbot de WhatsApp para thermohouse', 'historia', 'Chatbots', false, null, null, null, null),
    (170, 'Chatbot de WhatsApp para Smitt-Dent', 'historia', 'Chatbots', false, null, null, null, null),
    (180, 'Página web de GRESANOVA: comprar dominio, migrar desde GitHub Pages, fotos del equipo y detrás de cámaras, costos', 'historia', 'Web GRESANOVA', false, null, null, null,
        'Sitio publicado con dominio propio, fotos del equipo y sección de costos.'),
    (190, 'Plantilla base de CRM (repositorio, estructura de Supabase, roles y contratos resueltos)', 'historia', 'Procesos', false, null, null, null,
        'Un cliente nuevo parte de esta plantilla y no se construye desde cero.'),
    (200, 'Mejoras al CRM interno de GRESANOVA', 'historia', 'CRM interno', false, null, null, null, null),
    (210, 'Tiendas virtuales en Shopify para dropshipping (definir nicho y proveedores)', 'historia', 'Tiendas', false, null, null, null, null)
  )
insert into scrum_items (
  sprint_id, titulo, tipo, epica, estado, orden,
  responsable_id, revisor_id, horas_estimadas, criterios
)
select
  case when i.en_sprint0 then (select id from s0) end,
  i.titulo, i.tipo, i.epica,
  case when i.en_sprint0 then 'por_hacer' else 'backlog' end,
  i.orden,
  case i.resp
    when 'axel' then (select id from p_axel)
    when 'fran' then (select id from p_fran)
    when 'brau' then (select id from p_brau)
    when 'arat' then (select id from p_arat)
  end,
  case i.rev
    when 'brau' then (select id from p_brau)
  end,
  i.horas, i.criterios
from items i
where not exists (select 1 from scrum_items x where x.titulo = i.titulo);
