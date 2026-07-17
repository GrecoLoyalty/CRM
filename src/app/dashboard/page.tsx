import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const DESTINO_POR_ROL: Record<string, string> = {
  root: "/dashboard/root",
  ceo: "/dashboard/ceo",
  analista: "/dashboard/analisis",
  vendedor: "/dashboard/ventas",
  produccion: "/dashboard/estetica",
};

export default async function DashboardIndex() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase.from("perfiles").select("role, depto").eq("id", user.id).single();

  if (perfil?.role === "produccion" && perfil.depto) {
    redirect(`/dashboard/${perfil.depto}`);
  }

  redirect(DESTINO_POR_ROL[perfil?.role || "vendedor"]);
}
