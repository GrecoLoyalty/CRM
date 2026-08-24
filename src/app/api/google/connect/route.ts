import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { googleConfig, googleEnvOk, GOOGLE_SCOPES } from "@/lib/google/config";

export async function GET(req: NextRequest) {
  if (!googleEnvOk()) {
    return NextResponse.json(
      { error: "La integración con Google no está configurada en el servidor (faltan variables de entorno). Ver GOOGLE_SETUP.md." },
      { status: 500 }
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  const { clientId, redirectUri } = googleConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    // Fuerza a Google a mandar refresh_token SIEMPRE, no solo la primera
    // vez que el usuario autoriza la app — así reconectar tras revocar
    // acceso también funciona.
    prompt: "consent",
    scope: GOOGLE_SCOPES,
    state: user.id,
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
