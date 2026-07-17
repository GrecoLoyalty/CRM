import { createClient } from "@/lib/supabase/server";
import VistaAguila from "@/components/ceo/VistaAguila";
import PublicarBanner from "@/components/ceo/PublicarBanner";
import BarraMetaGlobal from "@/components/shared/BarraMetaGlobal";
import GestionPortalCliente from "@/components/ceo/GestionPortalCliente";

export default async function CeoPage() {
  const supabase = createClient();

  const [{ data: clientes }, { data: tareas }, { data: meta }] = await Promise.all([
    supabase.from("clientes").select("id, estado, fecha_pactada_entrega:fecha_entrega_estimada"),
    supabase.from("tareas").select("id, depto, estado, fecha_pactada_entrega"),
    supabase.from("metas_mensuales").select("*").order("mes", { ascending: false }).limit(1).single(),
  ]);

  const conteoPorDepto = {
    ventas: clientes?.filter((c) => c.estado === "PROSPECTO").length || 0,
    analisis: clientes?.filter((c) => ["TRANSFERIDO", "EN_ANALISIS"].includes(c.estado)).length || 0,
    estetica: tareas?.filter((t) => t.depto === "estetica" && t.estado !== "PUBLICADO").length || 0,
    desarrollo: tareas?.filter((t) => t.depto === "desarrollo" && t.estado !== "COMPLETADA").length || 0,
  };

  const hoy = new Date();
  const cuellosBotella = {
    ventas: 0,
    analisis: 0,
    estetica: tareas?.filter((t) => t.depto === "estetica" && t.fecha_pactada_entrega && new Date(t.fecha_pactada_entrega) < hoy && t.estado !== "PUBLICADO").length || 0,
    desarrollo: tareas?.filter((t) => t.depto === "desarrollo" && t.fecha_pactada_entrega && new Date(t.fecha_pactada_entrega) < hoy && t.estado !== "COMPLETADA").length || 0,
  };

  // Facturación real del mes — placeholder simple basado en clientes entregados este mes.
  // Ajustar con la lógica de facturación real del negocio cuando exista un módulo de cobros.
  const { count: clientesNuevosMes } = await supabase
    .from("clientes")
    .select("*", { count: "exact", head: true })
    .gte("fecha_cierre", new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString());

  const { data: clientesActivos } = await supabase
    .from("clientes")
    .select("id, nombre_empresa, estado, portal_token")
    .neq("estado", "HISTORICO")
    .order("updated_at", { ascending: false });

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-display font-semibold">Vista de Águila</h1>
        <p className="text-gray-500 text-sm mt-1">Panel de Control Ejecutivo — flujo global de clientes en tiempo real.</p>
      </div>

      {meta && <BarraMetaGlobal meta={meta} clientesNuevosMes={clientesNuevosMes || 0} />}

      <VistaAguila conteoPorDepto={conteoPorDepto} cuellosBotella={cuellosBotella} />

      <GestionPortalCliente clientes={clientesActivos || []} />

      <PublicarBanner />
    </div>
  );
}
