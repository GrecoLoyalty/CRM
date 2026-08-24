import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeCodeForTokens, obtenerInfoUsuarioGoogle, guardarConexionGoogle } from "@/lib/google/tokens";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state"); // perfil_id que inició el flujo
  const errorParam = req.nextUrl.searchParams.get("error");
  const destino = new URL("/dashboard/integraciones", req.url);

  if (errorParam) {
    // El usuario canceló el consentimiento en Google.
    destino.searchParams.set("google", "cancelado");
    return NextResponse.redirect(destino);
  }
  if (!code || !state) {
    destino.searchParams.set("google", "error");
    return NextResponse.redirect(destino);
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // El state debe coincidir con quien está logueado ahora mismo — evita que
  // alguien pegue un callback ajeno y conecte su Google a otra cuenta.
  if (!user || user.id !== state) {
    destino.searchParams.set("google", "error");
    return NextResponse.redirect(destino);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const infoUsuario = await obtenerInfoUsuarioGoogle(tokens.access_token);
    await guardarConexionGoogle(user.id, tokens, infoUsuario.email);
    destino.searchParams.set("google", "conectado");
  } catch (err: any) {
    console.error("[google-callback]", err);
    destino.searchParams.set("google", "error");
    destino.searchParams.set("motivo", err.message || "desconocido");
  }

  return NextResponse.redirect(destino);
}
