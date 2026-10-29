# Módulo Scrum — Tecnología & Soluciones

Convierte el método de trabajo del equipo en reglas del CRM. Está en **Scrum** (menú lateral) para Root, CEO, Marketing y Producción; adentro solo entra quien esté en el equipo Scrum o sea Root/CEO.

## Cómo ponerlo en marcha (3 pasos)

1. En el SQL Editor de Supabase corre `supabase/migrations/0042_scrum.sql`.
2. Las personas deben tener cuenta aprobada (`/solicitar-acceso` → Panel Root). Luego corre `supabase/seed_scrum.sql`: carga el equipo, el **Sprint 0** (29 oct → 2 nov 2026) y el backlog inicial. Busca a cada persona por un fragmento de su nombre (`arath`, `braulio`, `axel`, `francisco`, `sebasti`); ajústalos si en `perfiles` se escriben distinto. Lo que no encuentre queda sin responsable.
3. Entra a **Scrum → Sprints y equipo** y revisa horas por semana y dedicación de cada quien.

## Qué incluye

| Pantalla | Para qué sirve |
|---|---|
| **Tablero** | Sprint activo con objetivo, días restantes, capacidad, colchón de urgencias y reparto clientes/interno. Columnas Por hacer → En progreso → En revisión → Hecho. Daily escrito. |
| **Backlog** | Lista única priorizada (↑ ↓). El Product Owner mueve tarjetas a un sprint. |
| **Sprints y equipo** | Crear, activar y cerrar sprints con retrospectiva. Roles Scrum y horas por persona. Definición de “Terminado”. |

## Reglas que exige la base de datos (no solo la interfaz)

1. Nadie aprueba su propio trabajo: el revisor es distinto al responsable.
2. Para pasar a **En revisión** debe haber responsable y revisor.
3. Solo el **revisor** (o el CTO) marca “PR revisado”.
4. Solo el **CTO** (Root/CEO) da el visto bueno y cierra una tarjeta, y únicamente con las 4 condiciones de “Terminado”: probado en local/preview, PR revisado, documentado en 3 líneas y visto bueno del CTO.
5. Solo **Product Owner, Scrum Master o CTO** cambian prioridad o sprint.
6. Solo puede haber **un sprint activo**.
7. Al cerrar un sprint, lo que no quedó en Hecho regresa al backlog.

## Capacidad

`horas por semana × dedicación a desarrollo × semanas del sprint`, menos el colchón (20% por defecto). Las tarjetas de tipo **Urgencia** consumen el colchón; el resto consume la capacidad planeable. Los asesores (Sebastián) no cuentan.

## Fuera de alcance de esta primera versión

- Las tarjetas Scrum no se sincronizan con la tabla `tareas` del flujo Ventas → Análisis → Estética → Desarrollo; viven aparte y se ligan al cliente con `cliente_id`.
- No hay notificaciones nuevas (campana/correo) al asignar o aprobar.
- No hay gráfica de burndown ni historial de velocidad.
