import { createClient } from "@/lib/supabase/server";
import VistaAguila from "@/components/ceo/VistaAguila";
import PublicarBanner from "@/components/ceo/PublicarBanner";
import BarraMetaGlobal from "@/components/shared/BarraMetaGlobal";
import GestionPortalCliente from "@/components/ceo/GestionPortalCliente";
import EstadisticasEquipo from "@/components/shared/EstadisticasEquipo";
import BannerCaja from "@/components/ceo/BannerCaja";
import { obtenerEstadisticasEquipo } from "@/lib/estadisticas";

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
  const { count: clientesNuevosMes } = await supabase
    .from("clientes")
    .select("*", { count: "exact", head: true })
    .gte("fecha_cierre", new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString());

  const { data: clientesActivos } = await supabase
    .from("clientes")
    .select("id, nombre_empresa, estado, portal_token")
    .neq("estado", "HISTORICO")
    .order("updated_at", { ascending: false });

  const estadisticas = await obtenerEstadisticasEquipo(supabase);
  const { data: movimientosRecientes } = await supabase
    .from("movimientos_caja")
    .select("*")
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(15);

  // --- Detalle por departamento para la Vista de Águila interactiva ---
  const [
    { data: prospectosVentas },
    { data: clientesAnalisis },
    { data: tareasEstetica },
    { data: tareasDesarrollo },
  ] = await Promise.all([
    supabase.from("clientes").select("id, nombre_empresa, necesidad_detectada").eq("estado", "PROSPECTO").order("created_at"),
    supabase.from("clientes").select("id, nombre_empresa, estado, briefing_texto").in("estado", ["TRANSFERIDO", "EN_ANALISIS"]).order("created_at"),
    supabase.from("tareas").select("cliente_id, titulo, estado, clientes(id, nombre_empresa)").eq("depto", "estetica").neq("estado", "PUBLICADO").order("created_at"),
    supabase.from("tareas").select("cliente_id, titulo, estado, clientes(id, nombre_empresa)").eq("depto", "desarrollo").neq("estado", "COMPLETADA").order("created_at"),
  ]);

  const clientesPorDepto = {
    ventas: (prospectosVentas || []).map((c) => ({
      id: c.id,
      nombre: c.nombre_empresa,
      subtitulo: c.necesidad_detectada?.slice(0, 60) || "Prospecto nuevo",
    })),
    analisis: (clientesAnalisis || []).map((c) => ({
      id: c.id,
      nombre: c.nombre_empresa,
      subtitulo: c.briefing_texto ? "Briefing en progreso" : "Esperando briefing",
    })),
    estetica: (tareasEstetica || [])
      .filter((t: any) => t.clientes)
      .map((t: any) => ({ id: t.clientes.id, nombre: t.clientes.nombre_empresa, subtitulo: `${t.titulo} — ${t.estado}` })),
    desarrollo: (tareasDesarrollo || [])
      .filter((t: any) => t.clientes)
      .map((t: any) => ({ id: t.clientes.id, nombre: t.clientes.nombre_empresa, subtitulo: `${t.titulo} — ${t.estado}` })),
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-display font-semibold">Vista de Águila</h1>
        <p className="text-gray-500 text-sm mt-1">Panel de Control Ejecutivo — flujo global de clientes en tiempo real. Click en un departamento para ver quién está ahí.</p>
      </div>

      {meta && <BarraMetaGlobal meta={meta} clientesNuevosMes={clientesNuevosMes || 0} />}

      <EstadisticasEquipo datos={estadisticas} />

      <VistaAguila conteoPorDepto={conteoPorDepto} cuellosBotella={cuellosBotella} clientesPorDepto={clientesPorDepto} />

      <BannerCaja movimientosRecientes={movimientosRecientes || []} />

      <GestionPortalCliente clientes={clientesActivos || []} />

      <PublicarBanner />
    </div>
  );
}
