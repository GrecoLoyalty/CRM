import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PendienteAprobacion from "@/components/PendienteAprobacion";
import DashboardShell from "@/components/DashboardShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!perfil) redirect("/login");

  if (!perfil.activo) {
    return <PendienteAprobacion nombre={perfil.nombre_completo} />;
  }

  const { data: banners } = await supabase
    .from("banners_urgencia")
    .select("*")
    .gt("expira_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  return (
    <DashboardShell perfil={perfil} userId={user.id} banners={banners || []}>
      {children}
    </DashboardShell>
  );
}
