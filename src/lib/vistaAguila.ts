// Única fuente de verdad para los datos que alimentan el widget "Vista de
// Águila" (src/components/ceo/VistaAguila.tsx). Antes existían DOS
// implementaciones distintas de este cálculo — una en /dashboard/ceo
// (para Root/CEO) y otra en /dashboard/vista-aguila (para todos los demás
// roles) — y no coincidían entre sí:
//   - La de Root/CEO contaba TAREAS de estética/desarrollo (una tarea por
//     persona en la cadena de producción), así que un cliente con 3 tareas
//     abiertas aparecía 3 veces en la lista y se sumaba 3 veces al conteo.
//   - La de los demás roles contaba CLIENTES (deduplicado).
// Resultado: números y listados distintos para el mismo dato según quién
// mirara la pantalla. Este helper deja un solo cálculo, basado siempre en
// clientes únicos, para que Root/CEO y todo el equipo vean exactamente lo
// mismo (con la única diferencia de qué filas les deja ver la RLS).
export interface ClienteParaVistaAguila {
  id: string;
  nombre_empresa: string;
  necesidad_detectada: string | null;
  estado: string;
  briefing_texto: string | null;
  ruta_visual: boolean;
  ruta_software: boolean;
  fecha_entrega_estimada: string | null;
}

export function calcularVistaAguila(lista: ClienteParaVistaAguila[]) {
  const hoy = new Date();

  const enProduccionOSupervision = (c: ClienteParaVistaAguila) => c.estado === "EN_PRODUCCION" || c.estado === "EN_SUPERVISION";
  const vencido = (c: ClienteParaVistaAguila) =>
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

  return { conteoPorDepto, cuellosBotella, clientesPorDepto };
}
