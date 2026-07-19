import { createClient } from "@/lib/supabase/server";
import VistaAguila from "@/components/ceo/VistaAguila";
import EstadisticasEquipo from "@/components/shared/EstadisticasEquipo";
import { obtenerEstadisticasEquipo } from "@/lib/estadisticas";
import { calcularVistaAguila } from "@/lib/vistaAguila";

export default async function VistaAguilaPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: miPerfil } = await supabase.from("perfiles").select("role").eq("id", user!.id).single();
  const esCeoORoot = miPerfil?.role === "root" || miPerfil?.role === "ceo";
  const estadisticas = await obtenerEstadisticasEquipo(supabase);

  // Una sola consulta contra `clientes` — la RLS ya se encarga de que cada
  // rol solo reciba las filas a las que tiene acceso (root/ceo: todas;
  // vendedor: las suyas + las del equipo multi-persona; analista: las de
  // análisis; producción: las que tienen una tarea asignada a él, o forma
  // parte de su equipo). Así esta vista funciona igual para todos, solo
  // cambia el volumen de datos que llega.
  const { data: clientes } = await supabase
    .from("clientes")
    .select("id, nombre_empresa, necesidad_detectada, estado, briefing_texto, ruta_visual, ruta_software, fecha_entrega_estimada, updated_at")
    .neq("estado", "HISTORICO")
    .order("updated_at", { ascending: false });

  const { conteoPorDepto, cuellosBotella, clientesPorDepto } = calcularVistaAguila(clientes || []);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold">Vista de Águila</h1>
        <p className="text-gray-500 text-sm mt-1">
          {esCeoORoot
            ? "Flujo global de clientes en tiempo real. Click en un departamento para ver quién está ahí."
            : "En qué proceso van tus clientes ahora mismo. Click en un departamento para ver el detalle."}
        </p>
      </div>

      <EstadisticasEquipo datos={estadisticas} />

      <VistaAguila conteoPorDepto={conteoPorDepto} cuellosBotella={cuellosBotella} clientesPorDepto={clientesPorDepto} />
    </div>
  );
}
