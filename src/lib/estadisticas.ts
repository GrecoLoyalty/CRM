import type { SupabaseClient } from "@supabase/supabase-js";

export interface PuntoTiempoPersona {
  nombre: string;
  horas: number;
}

export interface PuntoMes {
  mes: string; // "2026-07"
  etiqueta: string; // "Jul 2026"
  total: number;
}

export interface EstadisticasEquipo {
  tiempoPorPersona: PuntoTiempoPersona[];
  ventasPorMes: PuntoMes[];
  flujoCajaPorMes: PuntoMes[];
  saldoActual: number;
}

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function etiquetaMes(mesIso: string) {
  const [anio, mes] = mesIso.split("-");
  return `${MESES[parseInt(mes, 10) - 1]} ${anio}`;
}

// Reúne los datos de las 3 gráficas que ve todo el equipo (Vista de Águila
// y Panel CEO): tiempo dentro del CRM por persona, ventas por mes, y el
// flujo de caja (balance acumulado) mes a mes. Se usa server-side; las
// políticas RLS de tiempo_uso_diario y movimientos_caja ya permiten
// lectura a cualquier usuario autenticado.
export async function obtenerEstadisticasEquipo(supabase: SupabaseClient): Promise<EstadisticasEquipo> {
  const hace7Dias = new Date();
  hace7Dias.setDate(hace7Dias.getDate() - 7);

  const [{ data: tiempos }, { data: movimientos }] = await Promise.all([
    supabase
      .from("tiempo_uso_diario")
      .select("segundos_activos, perfiles(nombre_completo)")
      .gte("fecha", hace7Dias.toISOString().slice(0, 10)),
    supabase.from("movimientos_caja").select("tipo, categoria, monto, fecha").order("fecha", { ascending: true }),
  ]);

  // --- 1. Tiempo por persona (últimos 7 días) ---
  const segundosPorPersona = new Map<string, number>();
  for (const fila of (tiempos || []) as any[]) {
    const nombre = fila.perfiles?.nombre_completo || "—";
    segundosPorPersona.set(nombre, (segundosPorPersona.get(nombre) || 0) + (fila.segundos_activos || 0));
  }
  const tiempoPorPersona = [...segundosPorPersona.entries()]
    .map(([nombre, seg]) => ({ nombre, horas: Math.round((seg / 3600) * 10) / 10 }))
    .sort((a, b) => b.horas - a.horas);

  // --- 2. Ventas por mes (ingresos con categoría "venta") ---
  const ventasPorMesMap = new Map<string, number>();
  // --- 3. Flujo de caja: neto por mes, para acumular después ---
  const netoPorMesMap = new Map<string, number>();
  let saldoActual = 0;

  for (const m of (movimientos || []) as any[]) {
    const mesIso = m.fecha.slice(0, 7); // "YYYY-MM"
    const signo = m.tipo === "ingreso" ? 1 : -1;
    saldoActual += signo * Number(m.monto);

    netoPorMesMap.set(mesIso, (netoPorMesMap.get(mesIso) || 0) + signo * Number(m.monto));

    if (m.tipo === "ingreso" && m.categoria === "venta") {
      ventasPorMesMap.set(mesIso, (ventasPorMesMap.get(mesIso) || 0) + Number(m.monto));
    }
  }

  const ventasPorMes = [...ventasPorMesMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([mes, total]) => ({ mes, etiqueta: etiquetaMes(mes), total }));

  // Balance acumulado mes a mes, para saber "cuánto dinero hay en caja" a lo largo del tiempo.
  const mesesOrdenados = [...netoPorMesMap.keys()].sort((a, b) => a.localeCompare(b));
  let acumulado = 0;
  const flujoCajaPorMes: PuntoMes[] = mesesOrdenados.map((mes) => {
    acumulado += netoPorMesMap.get(mes) || 0;
    return { mes, etiqueta: etiquetaMes(mes), total: acumulado };
  });

  return {
    tiempoPorPersona,
    ventasPorMes,
    flujoCajaPorMes: flujoCajaPorMes.slice(-12),
    saldoActual,
  };
}
