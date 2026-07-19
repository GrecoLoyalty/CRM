import { createClient } from "@/lib/supabase/server";
import VistaAguila from "@/components/ceo/VistaAguila";
import PublicarBanner from "@/components/ceo/PublicarBanner";
import BarraMetaGlobal from "@/components/shared/BarraMetaGlobal";
import GestionPortalCliente from "@/components/ceo/GestionPortalCliente";
import EstadisticasEquipo from "@/components/shared/EstadisticasEquipo";
import BannerCaja from "@/components/ceo/BannerCaja";
import { obtenerEstadisticasEquipo } from "@/lib/estadisticas";
import { calcularVistaAguila } from "@/lib/vistaAguila";

export default async function CeoPage() {
  const supabase = createClient();

  // OJO: esta es la MISMA consulta y el MISMO cálculo (calcularVistaAguila)
  // que usa /dashboard/vista-aguila para todos los demás roles. Antes había
  // dos implementaciones distintas: esta contaba TAREAS de estética/
  // desarrollo (un cliente con 3 tareas abiertas se contaba y se listaba 3
  // veces) mientras la otra contaba CLIENTES únicos — por eso Root/CEO veía
  // números y clientes repetidos que no coincidían con lo que veía el
  // resto del equipo. Ahora ambas vistas parten de los mismos clientes.
  const { data: clientes } = await supabase
    .from("clientes")
    .select("id, nombre_empresa, necesidad_detectada, estado, briefing_texto, ruta_visual, ruta_software, fecha_entrega_estimada, updated_at")
    .neq("estado", "HISTORICO")
    .order("updated_at", { ascending: false });

  const { data: meta } = await supabase.from("metas_mensuales").select("*").order("mes", { ascending: false }).limit(1).single();

  const { conteoPorDepto, cuellosBotella, clientesPorDepto } = calcularVistaAguila(clientes || []);

  const hoy = new Date();

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
