import { createServiceClient } from "@/lib/supabase/server";
import { googleConfig } from "./config";

interface RespuestaTokenGoogle {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token?: string;
}

// Paso 1 del flujo OAuth: cambia el "code" que Google mandó al callback por
// un access_token + refresh_token reales.
export async function exchangeCodeForTokens(code: string): Promise<RespuestaTokenGoogle> {
  const { clientId, clientSecret, redirectUri } = googleConfig();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google OAuth (exchange): ${await res.text()}`);
  return res.json();
}

async function refreshAccessToken(refreshToken: string): Promise<RespuestaTokenGoogle> {
  const { clientId, clientSecret } = googleConfig();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google OAuth (refresh): ${await res.text()}`);
  return res.json();
}

export async function obtenerInfoUsuarioGoogle(accessToken: string): Promise<{ email: string }> {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("No se pudo leer el perfil de Google del usuario");
  return res.json();
}

// Guarda la conexión recién autorizada. Se llama desde /api/google/callback.
export async function guardarConexionGoogle(perfilId: string, tokens: RespuestaTokenGoogle, email: string) {
  if (!tokens.refresh_token) {
    // Google solo entrega refresh_token la PRIMERA vez que un usuario autoriza
    // la app (o si se fuerza prompt=consent, que es lo que hacemos en
    // /api/google/connect). Si de todos modos no llega, probablemente ya
    // había una conexión previa fuera de sync con Google.
    throw new Error(
      "Google no devolvió un refresh_token. Si ya habías conectado esta cuenta antes, revócala en https://myaccount.google.com/permissions y vuelve a intentar conectar."
    );
  }
  const admin = createServiceClient();
  const { secret } = googleConfig();

  const { error } = await admin.rpc("fn_google_set_refresh_token", {
    p_perfil_id: perfilId,
    p_refresh_token: tokens.refresh_token,
    p_email: email,
    p_scope: tokens.scope,
    p_secret: secret,
  });
  if (error) throw new Error(error.message);

  await admin
    .from("perfiles_google")
    .update({
      access_token: tokens.access_token,
      access_token_expira: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    })
    .eq("perfil_id", perfilId);
}

export async function desconectarGoogle(perfilId: string) {
  const admin = createServiceClient();
  await admin.from("perfiles_google").delete().eq("perfil_id", perfilId);
}

export async function estadoConexionGoogle(perfilId: string) {
  const admin = createServiceClient();
  const { data } = await admin
    .from("perfiles_google")
    .select("email_google, scope, updated_at")
    .eq("perfil_id", perfilId)
    .maybeSingle();
  return data;
}

// Devuelve un access_token vigente para este usuario, refrescándolo primero
// si ya venció (o está por vencer). Regresa null si el usuario nunca
// conectó su cuenta de Google — quien llama esta función debe manejar ese
// caso como "no disponible", nunca como error duro.
export async function obtenerAccessTokenValido(perfilId: string): Promise<string | null> {
  const admin = createServiceClient();
  const { data: fila } = await admin
    .from("perfiles_google")
    .select("access_token, access_token_expira")
    .eq("perfil_id", perfilId)
    .maybeSingle();
  if (!fila) return null;

  const margenMs = 60_000; // refresca un minuto antes de que expire de verdad
  const vigente =
    fila.access_token &&
    fila.access_token_expira &&
    new Date(fila.access_token_expira).getTime() - Date.now() > margenMs;
  if (vigente) return fila.access_token;

  const { secret } = googleConfig();
  const { data: refreshToken, error } = await admin.rpc("fn_google_get_refresh_token", {
    p_perfil_id: perfilId,
    p_secret: secret,
  });
  if (error || !refreshToken) return null;

  try {
    const nuevos = await refreshAccessToken(refreshToken);
    await admin
      .from("perfiles_google")
      .update({
        access_token: nuevos.access_token,
        access_token_expira: new Date(Date.now() + nuevos.expires_in * 1000).toISOString(),
      })
      .eq("perfil_id", perfilId);
    return nuevos.access_token;
  } catch (err) {
    // El refresh_token pudo haber sido revocado desde la cuenta de Google
    // del usuario (https://myaccount.google.com/permissions). No truena el
    // resto del CRM: simplemente se comporta como "no conectado".
    console.error(`[google] No se pudo refrescar el token de ${perfilId}:`, err);
    return null;
  }
}
