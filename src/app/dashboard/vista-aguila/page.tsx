import { createClient } from "@/lib/supabase/server";
import VistaAguila from "@/components/ceo/VistaAguila";

export default async function VistaAguilaPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: miPerfil } = await supabase.from("perfiles").select("role").eq("id", user!.id).single();
  const esCeoORoot = miPerfil?.role === "root" || miPerfil?.role === "ceo";

  // Una sola consulta contra `clientes` — la RLS ya se encarga de que cada
  // rol solo reciba las filas a las que tiene acceso (root/ceo: todas;
  // vendedor: las suyas; analista: las de análisis; producción: las que
  // tienen una tarea asignada a él). Así esta vista funciona igual para
  // todos, solo cambia el volumen de datos que llega.
  const { data: clientes } = await supabase
    .from("clientes")
    .select("id, nombre_empresa, necesidad_detectada, estado, briefing_texto, ruta_visual, ruta_software, fecha_entrega_estimada, updated_at")
    .neq("estado", "HISTORICO")
    .order("updated_at", { ascending: false });

  const lista = clientes || [];
  const hoy = new Date();

  const enProduccionOSupervision = (c: (typeof lista)[number]) =>
    c.estado === "EN_PRODUCCION" || c.estado === "EN_SUPERVISION";
  const vencido = (c: (typeof lista)[number]) =>
    !!c.fecha_entrega_estimada && new Date(c.fecha_entrega_estimada) < hoy && c.estado !== "ENTREGADO";

  const conteoPorDepto = {
    ventas: lista.filter((c) => c.estado === "PROSPECTO").length,
    analisis: lista.filter((c) => c.estado === "TRANSFERIDO" || c.estado === "EN_ANALISIS").length,
    estetica: lista.filter((c) => c.ruta_visual && enProduccionOSupervision(c)).length,
    desarrollo: lista.filter((c) => c.ruta_software && enProduccionOSupervision(c)).length,
  };

  const cuellosBotella = {
    ventas: 0,
    analisis: 0,
    estetica: lista.filter((c) => c.ruta_visual && enProduccionOSupervision(c) && vencido(c)).length,
    desarrollo: lista.filter((c) => c.ruta_software && enProduccionOSupervision(c) && vencido(c)).length,
  };

  const clientesPorDepto = {
    ventas: lista
      .filter((c) => c.estado === "PROSPECTO")
      .map((c) => ({ id: c.id, nombre: c.nombre_empresa, subtitulo: c.necesidad_detectada?.slice(0, 60) || "Prospecto nuevo" })),
    analisis: lista
      .filter((c) => c.estado === "TRANSFERIDO" || c.estado === "EN_ANALISIS")
      .map((c) => ({ id: c.id, nombre: c.nombre_empresa, subtitulo: c.briefing_texto ? "Briefing en progreso" : "Esperando briefing" })),
    estetica: lista
      .filter((c) => c.ruta_visual && enProduccionOSupervision(c))
      .map((c) => ({ id: c.id, nombre: c.nombre_empresa, subtitulo: vencido(c) ? "⚠ Entrega vencida" : c.estado })),
    desarrollo: lista
      .filter((c) => c.ruta_software && enProduccionOSupervision(c))
      .map((c) => ({ id: c.id, nombre: c.nombre_empresa, subtitulo: vencido(c) ? "⚠ Entrega vencida" : c.estado })),
  };

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

      <VistaAguila conteoPorDepto={conteoPorDepto} cuellosBotella={cuellosBotella} clientesPorDepto={clientesPorDepto} />
    </div>
  );
}
