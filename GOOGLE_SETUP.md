# Conectar Gmail y Google Calendar al CRM

El CRM puede enviar todos los eventos a **un calendario central compartido**.
Una cuenta Google autorizada por OAuth debe tener permiso para editar ese
calendario. El CRM nunca guarda una contraseña de Google — solo tokens que Google
emite y que se pueden revocar en cualquier momento desde
https://myaccount.google.com/permissions.

Para que el botón "Conectar con Google" funcione, tú (como dueño del
proyecto) necesitas crear credenciales OAuth **una sola vez** en Google
Cloud Console. Esto no depende de qué usuario se conecte después.

## 1. Crear el proyecto y activar las APIs

1. Ve a https://console.cloud.google.com/ y crea un proyecto nuevo (o usa uno existente).
2. En **APIs y servicios → Biblioteca**, activa:
   - **Gmail API**
   - **Google Calendar API**

## 2. Configurar la pantalla de consentimiento OAuth

1. **APIs y servicios → Pantalla de consentimiento de OAuth**.
2. Tipo de usuario: **Interno** si todos en tu equipo usan Google Workspace
   con el mismo dominio; si no, **Externo**.
3. Completa nombre de la app, correo de soporte y logo (opcional).
4. En **Scopes**, agrega:
   - `.../auth/gmail.send`
   - `.../auth/calendar.events`
5. Si elegiste "Externo" y tu app queda en modo **Prueba**, agrega el correo
   de cada persona del equipo en **Usuarios de prueba** — si no, Google les
   bloqueará el login con un error de "app no verificada". Para quitar ese
   límite hay que enviar la app a verificación de Google (tarda días/semanas
   y solo hace falta si vas a tener muchos usuarios externos al dominio).

## 3. Crear las credenciales OAuth

1. **APIs y servicios → Credenciales → Crear credenciales → ID de cliente de OAuth**.
2. Tipo de aplicación: **Aplicación web**.
3. En **URIs de redirección autorizados**, agrega:
   - Para desarrollo local: `http://localhost:3000/api/google/callback`
   - Para producción: `https://tudominio.com/api/google/callback`
4. Guarda el **Client ID** y el **Client Secret** que Google te da.

## 4. Variables de entorno

Agrega esto a tu `.env.local` (y a las variables de entorno de tu hosting,
ej. Vercel):

```
GOOGLE_CLIENT_ID=el-client-id-que-copiaste
GOOGLE_CLIENT_SECRET=el-client-secret-que-copiaste
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback
```

`VAULT_SECRET_KEY` (la misma que ya usas para la Bóveda de contraseñas) se
reutiliza para cifrar el refresh_token de Google — si ya la tienes
configurada, no necesitas nada más.

## 5. Preparar el calendario central

1. Crea el calendario compartido en Google Calendar.
2. Invita manualmente al equipo desde la configuración del calendario y dales
   el permiso que quieras para agregar o editar eventos directamente en Google.
3. Comparte el calendario con la cuenta de Google que autorizará el CRM y dale
   el permiso **Hacer cambios en los eventos**.
4. En **Configuración del calendario → Integrar el calendario**, copia el ID.
5. Conecta la cuenta autorizada desde **Integraciones** en el CRM. Obtén el ID
   de su perfil en la tabla `perfiles` y configura estas variables en `.env.local`
   y en el hosting:

```
GOOGLE_SHARED_CALENDAR_ID=xxxxxxxxxxxxxxxx@group.calendar.google.com
GOOGLE_SHARED_CALENDAR_PROFILE_ID=uuid-del-perfil-autorizado
```

Reinicia o redepliega la aplicación después de configurar las variables. En este
modo todos los eventos nuevos del CRM van a ese calendario central,
independientemente de quién los cree. El CRM no envía invitaciones por evento:
el acceso del equipo se administra manualmente en Google Calendar.

## 6. Aplicar la migración de base de datos

Corre `supabase/migrations/0023_integracion_google.sql` contra tu proyecto
de Supabase (SQL Editor, o tu flujo normal de migraciones). Crea la tabla
`perfiles_google` y dos columnas nuevas en `eventos_calendario`.

Aplica también `supabase/migrations/0030_eventos_visibles_portal.sql` y
`supabase/migrations/0031_google_calendar_destino.sql` y
`supabase/migrations/0032_agenda_personal_google.sql`, en ese orden. La primera
agrega la opción de compartir eventos con el portal; la segunda conserva el
destino de eventos centrales y la tercera guarda el ID del evento personal de
Google. Si hay migraciones anteriores pendientes, aplícalas primero en orden
numérico.

## 7. Probarlo

1. Entra al CRM, ve a **Integraciones** (abajo del menú lateral).
2. Click en **Conectar con Google** → inicia sesión → acepta los permisos.
3. Deberías volver al CRM con un aviso de "conectado" y tu correo de Google visible.
4. Crea un evento en el **Calendario** del CRM: debería aparecer en el
   calendario central. El equipo podrá verlo y editarlo según los permisos que
   asignaste desde Google Calendar.
5. Cada integrante debe conectar su cuenta personal desde **Integraciones** para
   sincronizar los bloques de **Mi calendario personal** con su Google Calendar
   privado. Los bloques disponibles se crean como eventos transparentes para no
   bloquear ese horario en Google. Al conectar, también se suben los bloques
   anteriores que todavía no estaban sincronizados.

## Qué se puede hacer ya, y qué falta conectar a la UI

Ya implementado:
- Conexión de la cuenta Google autorizada desde `/dashboard/integraciones`.
- Sincronización automática del calendario compartido → Google Calendar
   (crear, editar, borrar eventos) en el calendario central configurado; los
   eventos anteriores conservan su destino.
- Sincronización de la agenda personal con el Google Calendar propio de cada
   integrante, incluyendo bloques existentes al conectar la cuenta.
- Función lista para usar `enviarGmail(perfilId, { to, subject, html })`
  en `src/lib/google/gmail.ts`, que manda un correo real desde el Gmail del
  usuario.

Lo que **no** hice todavía porque depende de una decisión tuya: conectar
`enviarGmail` a algún flujo concreto del CRM (por ejemplo, que el vendedor
mande la ficha de cliente en PDF desde su propio Gmail, o que las
notificaciones de tickets salgan del Gmail del asignado en vez de Resend).
Dime cuál flujo quieres y lo conecto — es una llamada de una línea a esa
función donde ya se arma el correo.
