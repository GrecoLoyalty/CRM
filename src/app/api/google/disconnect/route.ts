import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { desconectarGoogle } from "@/lib/google/tokens";

export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  await desconectarGoogle(user.id);
  return NextResponse.json({ ok: true });
}
