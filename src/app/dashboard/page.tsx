import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const DESTINO_POR_ROL: Record<string, string> = {
  root: "/dashboard/root",
  ceo: "/dashboard/ceo",
  analista: "/dashboard/ceo",
  vendedor: "/dashboard/ceo",
  produccion: "/dashboard/ceo",
};

export default async function DashboardIndex() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase.from("perfiles").select("role, depto").eq("id", user.id).single();

  redirect(DESTINO_POR_ROL[perfil?.role || "vendedor"]);
}
