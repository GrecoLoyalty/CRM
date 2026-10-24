# GEMINI.md — Directrices de Desarrollo para GRESANOVA OS

## 1. Idioma y Comunicación
- **Idioma Obligatorio:** Toda la comunicación, explicaciones, respuestas, comentarios técnicos y resúmenes deben realizarse en **español**.
- **Tono:** Profesional, técnico, directo y conciso.

---

## 2. Visión del Proyecto
**GRESANOVA OS** es un sistema CRM y de flujo operativo interno multi-rol, diseñado para coordinar las operaciones entre distintos departamentos:
- **Ventas:** Captación de prospectos, pipeline y conversión a clientes.
- **Análisis:** Briefing obligatorio, evaluación y definición de ruta.
- **Estética Visual:** Cadena de tareas (Camarógrafo → Editor → Community Manager) con autoasignación.
- **Desarrollo:** Asignación de tareas técnicas y gestión de la Suite de aplicaciones.
- **Marketing:** Marcas, calendarios, guiones y publicaciones.
- **CEO / Dirección:** Vista de Águila (grafo interactivo D3), banners de urgencia, métricas y portal de clientes.
- **Root:** Auditoría inmutable, bóveda cifrada (AES-256 / pgcrypto), gestión de roles y configuración global.

---

## 3. Stack Tecnológico
- **Framework Web:** Next.js 14 (App Router)
- **Lenguaje:** TypeScript (modo estricto)
- **Estilos:** Tailwind CSS
- **Base de Datos & Auth:** Supabase (PostgreSQL, Auth, Realtime, Row Level Security - RLS)
- **Visualización:** D3.js
- **Generación de Reportes / PDF:** `@react-pdf/renderer`
- **Gestor de Paquetes:** npm / pnpm

---

## 4. Estructura del Código
```
src/
├── app/                  # Rutas de Next.js (App Router), layouts, APIs y páginas públicas/privadas
│   ├── api/              # Endpoints de API (Google, pizarrones, vault, clientes, portal)
│   ├── dashboard/        # Vistas departamentales y compartidas
│   ├── login/            # Autenticación y acceso
│   ├── portal/           # Portal público para clientes con token
│   └── solicitar-acceso/ # Flujo de autoservicio de acceso
├── components/           # Componentes modulares agrupados por dominio/departamento
├── hooks/                # Hooks personalizados (pings de inactividad, sesión, etc.)
├── lib/                  # Clientes de Supabase, integraciones (Google, PDF), utilidades y tipos
└── supabase/migrations/  # Migraciones SQL versionadas
```

---

## 5. Estándares y Convenciones de Ingeniería
- **Seguridad y RLS:** La seguridad reside en PostgreSQL. Cada nueva tabla o ajuste de acceso debe contemplar políticas RLS (Row Level Security) explícitas en `supabase/migrations/`. Nunca exponer datos sensibles ni omitir comprobaciones en el cliente.
- **Bóveda y Credenciales:** Nunca almacenar ni mostrar secretos en texto plano. La bóveda está cifrada con pgcrypto y su lectura está restringida y auditada.
- **Next.js App Router:**
  - Emplear Server Components por defecto.
  - Usar `'use client'` únicamente cuando se necesiten hooks de React, eventos interactivos o suscripciones a Supabase Realtime.
- **Tipado Estricto:** Mantener las definiciones en `src/lib/types.ts` o tipado específico del dominio. Evitar el uso de `any` o aserciones de tipo forzadas.
- **Migraciones SQL:** Nuevos cambios de esquema deben crearse como una nueva migración con numeración incremental en `supabase/migrations/` (ej. `0042_nombre_cambio.sql`).
- **Verificación:** Antes de dar por concluida una tarea, ejecutar y validar con:
  - `npm run lint`
  - `npm run build`
