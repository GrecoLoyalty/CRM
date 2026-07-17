import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Solo Root y CEOs pueden llegar aquí (reforzado también por RLS en la tabla).
async function verificarAcceso(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: perfil } = await supabase.from("perfiles").select("role").eq("id", user.id).single();
  if (!perfil || !["root", "ceo"].includes(perfil.role)) return null;
  return user;
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const user = await verificarAcceso(supabase);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await req.json();
  const { cliente_id, servicio, usuario, password, notas } = body;

  const { data, error } = await supabase.rpc("fn_vault_set", {
    p_cliente_id: cliente_id,
    p_servicio: servicio,
    p_usuario: usuario,
    p_password: password,
    p_secret: process.env.VAULT_SECRET_KEY,
    p_notas: notas || null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: data });
}

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const user = await verificarAcceso(supabase);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  const { data, error } = await supabase.rpc("fn_vault_get", {
    p_id: id,
    p_secret: process.env.VAULT_SECRET_KEY,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ password: data });
}
