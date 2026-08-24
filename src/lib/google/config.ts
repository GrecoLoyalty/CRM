// Configuración central de la integración con Google (Gmail + Calendar).
//
// A diferencia del correo por Resend (una sola API key para todo el CRM),
// aquí CADA USUARIO conecta su propia cuenta de Google vía OAuth2. Para
// eso el CRM necesita un Client ID/Secret de un proyecto en Google Cloud
// Console — ver GOOGLE_SETUP.md en la raíz del proyecto para la guía
// paso a paso de cómo generarlos.
//
// Variables de entorno necesarias (.env.local y en Vercel/hosting):
//   GOOGLE_CLIENT_ID
//   GOOGLE_CLIENT_SECRET
//   GOOGLE_REDIRECT_URI      (ej. https://tudominio.com/api/google/callback)
//   VAULT_SECRET_KEY         (ya existe si usas la Bóveda: se reutiliza
//                             para cifrar el refresh_token de Google)

export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/calendar.events",
].join(" ");

export function googleEnvOk() {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REDIRECT_URI &&
    process.env.VAULT_SECRET_KEY
  );
}

export function googleConfig() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: process.env.GOOGLE_REDIRECT_URI!,
    // Reutiliza la misma clave de cifrado que ya usa la Bóveda de contraseñas.
    secret: process.env.VAULT_SECRET_KEY!,
  };
}
