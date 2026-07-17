# GRESANOVA OS — MVP

Sistema de Gestión de Relaciones y Flujo Operativo, construido según `GRESANOVA_OS_v1_Blueprint.pdf` y `Manual_Flujo_Trabajo_Departamentos.docx`.

**Stack:** Next.js 14 (App Router, TypeScript) + Supabase (Postgres, Auth, Realtime) + Tailwind CSS + Vercel + D3.js.

---

## 1. Qué incluye este MVP

| Módulo | Estado |
|---|---|
| Auth + RBAC (Root, CEO, Analista, Vendedor, Producción) | ✅ Completo, roles viven en la base de datos |
| Ventas: formulario de captación, pipeline, conversión a cliente, alerta de duplicados | ✅ Completo |
| Análisis: interfaz de doble entrada, Briefing obligatorio (bloqueo real en frontend **y** backend), switches de ruta | ✅ Completo |
| Estética Visual: cadena Camarógrafo → Editor → Community Manager con auto-asignación | ✅ Completo |
| Desarrollo: tareas + Librería de la Suite (apps reutilizables) | ✅ Completo |
| Auto-asignación por carga de trabajo | ✅ Completo (función `fn_auto_asignar` en SQL) |
| Vista de Águila (CEO) con grafo D3 animado y detección de cuellos de botella | ✅ Completo |
| Banners de urgencia con expiración | ✅ Completo |
| Bóveda de contraseñas cifrada (AES-256 vía pgcrypto) | ✅ Completo, acceso Root + CEOs, cada lectura se audita |
| Audit Trail inmutable con filtros y exportación CSV | ✅ Completo |
| Metas mensuales + barra de progreso global | ✅ Completo (reseteo automático requiere programar el cron, ver sección 5) |
| Portal público del cliente (línea de tiempo con fechas puestas por CEOs) | ✅ Completo, sin login, por token único |
| Solicitud de acceso auto-servicio (`/solicitar-acceso`) con aprobación desde Panel Root | ✅ Completo — ver sección 4.5 |
| Chat en tiempo real por cliente, con acceso de los 3 CEOs a todos los chats | ✅ Completo (Supabase Realtime) |
| Chat interno de equipo — 1 a 1 y grupal, sin depender de un cliente | ✅ Completo (Supabase Realtime), botón 👥 junto al chat de clientes |
| Rechazar solicitudes / eliminar usuarios desde Panel Root | ✅ Completo — borra la cuenta de Auth y su perfil en cascada |
| Diseño responsive (móvil, tablet, escritorio) | ✅ Sidebar se vuelve un menú deslizable en pantallas chicas; tablas con scroll horizontal; formularios y tarjetas se acomodan en una sola columna |
| Ficha de cliente compartida + Bitácora entre departamentos | ✅ `/dashboard/cliente/[id]` — cualquier depto con acceso al cliente ve la necesidad detectada (Ventas), el Briefing (Análisis), los entregables de cada tarea, y puede agregar notas/links visibles para todos en tiempo real |
| Notificaciones in-app con campana y tiempo real | ✅ Completo |
| Detección de inactividad (Tiempo Total Abierta vs Tiempo Activo Real) | ✅ Completo, cálculo verificado en backend, no solo en el navegador |
| Formulario de Profundidad (externo, sin login) | ⚠️ Simplificado — el token y la expiración de 72h ya existen en la base de datos; falta construir el formulario público en sí porque **el cuestionario todavía no está definido** (blueprint, decisión pendiente #02). Página siguiente natural: `/formulario/[token]`. |
| Notificaciones push reales (fuera del navegador) | ⚠️ Simplificado a notificaciones in-app. Conectar un proveedor (OneSignal, Firebase Cloud Messaging, o Web Push nativo) es un paso posterior — no requiere cambiar el modelo de datos. |
| Capturas de pantalla periódicas | ❌ No incluido — el blueprint lo deja como decisión pendiente (#03 de la tabla de decisiones) por sus implicaciones legales. Solo se implementó la detección de inactividad por eventos de mouse/teclado. |

---

## 2. Decisiones que tomamos por ti (documentadas para que las ajustes)

El blueprint marcaba 10 puntos como "PENDIENTE DE DEFINIR". Para poder construir un sistema funcional, tomamos estas decisiones por defecto — todas son fáciles de cambiar en el código o en la base de datos:

1. **Stack tecnológico:** Next.js + Supabase + Vercel (ya definido por ti).
2. **Duplicados de prospectos:** el sistema **avisa** (tabla `clientes_duplicados_alertas`) pero no bloquea. Ajustar en `crearProspecto()` si prefieres bloqueo.
3. **Asignación de tareas dentro del depto:** automática por carga de trabajo (según tu respuesta). Ver `fn_auto_asignar()` en el SQL — hoy reparte por menor número de tareas activas; puedes cambiar el criterio.
4. **Portal del cliente:** implementado como link público de solo estatus (según tu respuesta), sin login.
5. **Reseteo de metas mensuales:** automático por defecto (`reseteo_automatico = true`), pero editable por Root en el panel.
6. **Escritura en la Bóveda:** limitado a Root y los 3 CEOs (nivel más restrictivo sugerido por el blueprint).
7. **Supervisión de chats por CEOs:** silenciosa (no se notifica al empleado que un CEO está leyendo). Si prefieres transparencia, es un cambio de una línea en `ChatWidget`.
8. **Repositorio de proyectos previos:** la tabla `suite_apps` está vacía — cárgala desde Supabase o desde el módulo de Desarrollo conforme vayan existiendo.
9. **Módulo Post-Venta:** no incluido (el propio blueprint lo marca como fase 2).
10. **Preguntas del Formulario de Profundidad:** pendientes de que definan el cuestionario — ver arriba.

---

## 3. Estructura del proyecto

```
gresanova-crm/
├── supabase/migrations/0001_init.sql   ← Todo el esquema: tablas, RLS, triggers, funciones
├── src/
│   ├── app/
│   │   ├── login/                      ← Login
│   │   ├── dashboard/
│   │   │   ├── root/                   ← Panel Root (metas, roles, auditoría)
│   │   │   ├── ceo/                    ← Vista de Águila, bóveda, banners, portal
│   │   │   ├── ventas/                 ← Captación y pipeline
│   │   │   ├── analisis/               ← Briefing y switches de ruta
│   │   │   ├── estetica/               ← Cadena de producción visual
│   │   │   └── desarrollo/             ← Tareas + librería de apps
│   │   ├── portal/[token]/             ← Portal público del cliente (sin login)
│   │   └── api/vault/                  ← Cifrado/descifrado de credenciales
│   ├── components/                     ← UI por módulo
│   ├── lib/supabase/                   ← Clientes de Supabase (browser/server)
│   └── middleware.ts                   ← Protección de rutas por rol
```

---

## 4. Cómo desplegarlo (paso a paso)

### 4.1 Supabase
1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Ve a **SQL Editor** → pega el contenido completo de `supabase/migrations/0001_init.sql` → **Run**. Repite lo mismo con `0002_solicitud_acceso.sql`, `0003_chat_interno.sql`, `0004_fix_rls_conversaciones.sql` y `0005_bitacora_cliente.sql`, en ese orden.
3. Ve a **Authentication → Providers** y confirma que Email esté habilitado.
4. Crea a tus primeros usuarios en **Authentication → Users → Add user** (email + password). Anota su `UUID`.
5. Para cada usuario, ve a **Table Editor → perfiles** y agrega una fila con ese `UUID` como `id`, su `nombre_completo` y su `role` (`root`, `ceo`, `analista`, `vendedor` o `produccion`). El primer usuario que crees debería ser `root` (Oscar).
6. (Opcional, para fotos/archivos) Crea un bucket público en **Storage** llamado `gresanova-files` para `foto_url`, `briefing_archivo_url` y `avatar_url`.
7. Copia tus claves desde **Project Settings → API**: `Project URL`, `anon public key` y `service_role key`.

### 4.2 GitHub
```bash
cd gresanova-crm
git init
git add .
git commit -m "GRESANOVA OS — MVP inicial"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/gresanova-os.git
git push -u origin main
```

### 4.3 Vercel
1. Ve a [vercel.com/new](https://vercel.com/new) e importa el repositorio de GitHub.
2. En **Environment Variables**, agrega las 4 variables de `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `VAULT_SECRET_KEY` (genera una con `openssl rand -base64 32`)
3. Deploy. Vercel te dará una URL pública (ej. `gresanova-os.vercel.app`).

### 4.4 Desarrollo local
```bash
npm install
cp .env.example .env.local   # completa con tus valores reales
npm run dev                  # http://localhost:3000
```

### 4.5 Cómo entran nuevos usuarios al sistema (sin que tú los crees a mano)

1. Cualquier persona del equipo va a `/solicitar-acceso`, llena su nombre, correo, contraseña y opcionalmente a qué área pertenece.
2. Al enviar el formulario, Supabase crea su cuenta de autenticación y un trigger (`0002_solicitud_acceso.sql`) le crea automáticamente una fila en `perfiles` con `activo = false` — **no puede entrar todavía**, ve una pantalla de "pendiente de aprobación" si intenta iniciar sesión.
3. Tú (Root) entras a **Panel Root → Solicitudes pendientes**, ahí ves su nombre y la nota que dejó, le asignas Rol / Departamento / Subrol reales, y le das **"Aprobar acceso"**.
4. En cuanto la apruebas, puede volver a iniciar sesión y ya entra con su rol asignado.

Esto reemplaza tener que crear usuarios manualmente desde Supabase — solo lo necesitas para tu **primera cuenta root**, que es la única que no tiene quién la apruebe (ver sección 5 de más abajo, "Crear tu primer usuario root").

---

## 5. Pendientes técnicos antes de producción real

- **Crear tu primer usuario root:** el flujo de `/solicitar-acceso` necesita que *alguien* ya sea root para aprobar solicitudes — así que la primera cuenta se crea a mano una sola vez: Supabase → **Authentication → Users → Add user**, copia su UID, y en **SQL Editor** corre:
  ```sql
  update perfiles set role = 'root', activo = true where id = 'EL-UID-QUE-COPIASTE';
  ```
  (el trigger ya le crea la fila en `perfiles` al registrarse desde `/solicitar-acceso`; este `update` solo la convierte en root y la activa). De ahí en adelante, todos los demás se registran solos y tú los apruebas desde el Panel Root.
- **Correr las migraciones 0002 y 0003:** además de `0001_init.sql`, corre también `supabase/migrations/0002_solicitud_acceso.sql` y `supabase/migrations/0003_chat_interno.sql` en el SQL Editor — sin estas, el registro público y el chat de equipo no funcionan.

- **Reseteo automático de metas:** programa un Cron Job en Supabase (**Database → Cron Jobs**) que llame `select fn_resetear_metas_si_aplica();` el día 1 de cada mes.
- **Notificaciones push reales:** conectar un proveedor externo (Web Push, OneSignal, FCM) — hoy son in-app + tiempo real dentro de la app.
- **Formulario de Profundidad:** construir `/formulario/[token]` en cuanto definan el cuestionario.
- **Subida de archivos:** los campos `foto_url`, `briefing_archivo_url` y `avatar_url` están listos en la base de datos, pero los formularios actuales solo aceptan URLs de texto. Conectar Supabase Storage con un input de tipo archivo es un paso natural siguiente.
- **Auditoría de LOGIN:** hoy el trigger audita CREATE/UPDATE/DELETE en tablas clave; para auditar también los inicios de sesión, agrega una función que inserte en `audit_trail` desde un hook de `onAuthStateChange` en el cliente, o desde un Supabase Auth Hook.

---

## 6. Seguridad

- Row Level Security (RLS) está activo en **todas** las tablas — los permisos de la Tabla Maestra de Roles del blueprint están implementados como políticas SQL, no solo en el frontend.
- El Audit Trail es **INSERT-only**: los permisos de UPDATE/DELETE fueron revocados a nivel de base de datos.
- La Bóveda nunca guarda contraseñas en texto plano — se cifran con `pgp_sym_encrypt` (AES) usando `VAULT_SECRET_KEY`, una variable de entorno que **nunca** debe subirse a GitHub (ya está en `.gitignore` vía `.env.local`).
