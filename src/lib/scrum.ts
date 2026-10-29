import type { EstadoScrumItem, MiembroScrum, RolScrum, ScrumItem, Sprint, TipoScrumItem } from "@/lib/types";

export const ROL_SCRUM_LABEL: Record<RolScrum, string> = {
  product_owner: "Product Owner",
  scrum_master: "Scrum Master",
  desarrollo: "Desarrollo",
  asesor: "Asesor",
};

export const TIPO_ITEM_LABEL: Record<TipoScrumItem, string> = {
  historia: "Historia",
  tarea: "Tarea",
  bug: "Falla",
  urgencia: "Urgencia",
};

export const TIPO_ITEM_COLOR: Record<TipoScrumItem, string> = {
  historia: "badge-accent",
  tarea: "badge-neutral",
  bug: "badge-warn",
  urgencia: "badge-urgent",
};

/** Columnas del tablero, en el orden del flujo. "backlog" vive en su propia pantalla. */
export const COLUMNAS_TABLERO: { estado: EstadoScrumItem; label: string }[] = [
  { estado: "por_hacer", label: "Por hacer" },
  { estado: "en_progreso", label: "En progreso" },
  { estado: "en_revision", label: "En revisión" },
  { estado: "hecho", label: "Hecho" },
];

export const SIGUIENTE_ESTADO: Partial<Record<EstadoScrumItem, EstadoScrumItem>> = {
  por_hacer: "en_progreso",
  en_progreso: "en_revision",
};

export const ANTERIOR_ESTADO: Partial<Record<EstadoScrumItem, EstadoScrumItem>> = {
  en_progreso: "por_hacer",
  en_revision: "en_progreso",
};

/** Las 4 condiciones de la Definición de "Terminado". */
export const DOD: { campo: "dod_probado" | "dod_pr_revisado" | "dod_aprobado" | "dod_documentado"; label: string; quien: string }[] = [
  { campo: "dod_probado", label: "Probado en local o preview, no en producción", quien: "Responsable" },
  { campo: "dod_pr_revisado", label: "Rama + pull request revisado por otra persona", quien: "Revisor" },
  { campo: "dod_aprobado", label: "El CTO lo vio funcionando", quien: "CTO" },
  { campo: "dod_documentado", label: "Documentado en 3 líneas: qué cambió y cómo se usa", quien: "Responsable" },
];

export const CEREMONIAS = [
  { nombre: "Planning", cuando: "Primer día del sprint", duracion: "1-2 h", para: "Elegir qué entra al sprint y quién lo hace." },
  { nombre: "Daily", cuando: "Todos los días", duracion: "15 min", para: "Qué hice, qué haré y qué me bloquea." },
  { nombre: "Review", cuando: "Último día del sprint", duracion: "1 h", para: "Mostrar lo terminado funcionando y recibir la aprobación del CTO." },
  { nombre: "Retrospectiva", cuando: "Después de la Review", duracion: "30-45 min", para: "Qué mejorar del proceso." },
];

export function esInterno(item: Pick<ScrumItem, "cliente_id">): boolean {
  return !item.cliente_id;
}

/** Días naturales del sprint, contando inicio y fin. */
export function diasDelSprint(sprint: Pick<Sprint, "fecha_inicio" | "fecha_fin">): number {
  const ini = new Date(`${sprint.fecha_inicio}T00:00:00`).getTime();
  const fin = new Date(`${sprint.fecha_fin}T00:00:00`).getTime();
  return Math.max(1, Math.round((fin - ini) / 86400000) + 1);
}

/** Días que faltan para terminar (0 si ya pasó). */
export function diasRestantes(sprint: Pick<Sprint, "fecha_fin">, hoy = new Date()): number {
  const fin = new Date(`${sprint.fecha_fin}T23:59:59`).getTime();
  return Math.max(0, Math.ceil((fin - hoy.getTime()) / 86400000));
}

export interface ResumenCapacidad {
  bruta: number; // horas reales del equipo en el sprint
  colchon: number; // horas reservadas para urgencias
  disponible: number; // horas que se pueden planear
  planeadas: number; // horas estimadas de lo planeado (sin urgencias)
  urgencias: number; // horas estimadas de urgencias
  sinEstimar: number; // tarjetas sin horas
  horasClientes: number;
  horasInternas: number;
  pctClientesReal: number;
  restoColchon: number;
  excedido: boolean;
}

/**
 * Capacidad = suma(horas_semana × factor_dedicacion) × semanas del sprint.
 * El colchón se descuenta antes de planear; las urgencias consumen el colchón.
 * Los asesores no cuentan: no construyen, solo orientan.
 */
export function calcularCapacidad(
  equipo: Pick<MiembroScrum, "rol_scrum" | "horas_semana" | "factor_dedicacion">[],
  sprint: Pick<Sprint, "fecha_inicio" | "fecha_fin" | "colchon_pct">,
  items: Pick<ScrumItem, "tipo" | "horas_estimadas" | "cliente_id">[]
): ResumenCapacidad {
  const semanas = diasDelSprint(sprint) / 7;
  const porSemana = equipo
    .filter((m) => m.rol_scrum !== "asesor")
    .reduce((t, m) => t + Number(m.horas_semana) * Number(m.factor_dedicacion), 0);

  const bruta = porSemana * semanas;
  const colchon = (bruta * sprint.colchon_pct) / 100;
  const disponible = bruta - colchon;

  const planificables = items.filter((i) => i.tipo !== "urgencia");
  const urgentes = items.filter((i) => i.tipo === "urgencia");
  const suma = (arr: typeof items) => arr.reduce((t, i) => t + Number(i.horas_estimadas || 0), 0);

  const planeadas = suma(planificables);
  const urgencias = suma(urgentes);
  const horasClientes = suma(planificables.filter((i) => !!i.cliente_id));
  const horasInternas = planeadas - horasClientes;

  return {
    bruta,
    colchon,
    disponible,
    planeadas,
    urgencias,
    sinEstimar: items.filter((i) => i.horas_estimadas == null).length,
    horasClientes,
    horasInternas,
    pctClientesReal: planeadas > 0 ? Math.round((horasClientes / planeadas) * 100) : 0,
    restoColchon: colchon - urgencias,
    excedido: planeadas > disponible || urgencias > colchon,
  };
}

export const fmtHoras = (n: number) => `${Math.round(n * 10) / 10} h`;
