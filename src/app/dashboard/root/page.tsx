import { createClient } from "@/lib/supabase/server";
import PanelMetas from "@/components/root/PanelMetas";
import TablaAuditoria from "@/components/root/TablaAuditoria";
import GestionRoles from "@/components/root/GestionRoles";

export default async function RootPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: metaActual }, { data: auditoria }, { data: perfiles }] = await Promise.all([
    supabase.from("metas_mensuales").select("*").order("mes", { ascending: false }).limit(1).single(),
    supabase.from("audit_trail").select("*").order("timestamp", { ascending: false }).limit(50),
    supabase.from("perfiles").select("*").order("nombre_completo"),
  ]);

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      <div>
        <h1 className="text-2xl font-display font-semibold">Panel Root</h1>
        <p className="text-gray-500 text-sm mt-1">Super-Admin — poder de veto, auditoría forense y metas globales.</p>
      </div>

      <PanelMetas metaActual={metaActual} />
      <GestionRoles perfiles={perfiles || []} currentUserId={user!.id} />
      <TablaAuditoria registros={auditoria || []} perfiles={perfiles || []} />
    </div>
  );
}
