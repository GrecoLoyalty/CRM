export type UserRole = "root" | "ceo" | "analista" | "vendedor" | "produccion";
export type ProduccionSubrol = "camarografo" | "editor" | "community_manager" | "fullstack" | "ia_ml" | "qa";
export type Depto = "ventas" | "analisis" | "estetica" | "desarrollo";

export type EstadoCliente =
  | "PROSPECTO"
  | "TRANSFERIDO"
  | "EN_ANALISIS"
  | "EN_PRODUCCION"
  | "EN_SUPERVISION"
  | "ENTREGADO"
  | "HISTORICO";

export type EstadoTarea =
  | "PENDIENTE"
  | "EN_PROGRESO"
  | "BLOQUEADA"
  | "GRABADO"
  | "EDICION_LISTA"
  | "PUBLICADO"
  | "COMPLETADA";

export type NivelUrgencia = "informativo" | "importante" | "urgente";

export interface Perfil {
  id: string;
  nombre_completo: string;
  role: UserRole;
  subrol: ProduccionSubrol | null;
  depto: Depto | null; // departamento principal (compatibilidad)
  activo: boolean;
  nota_solicitud?: string | null;
  avatar_url: string | null;
  color_calendario?: string | null;
}

// ---------------------------------------------------------------------
// Calendario compartido
// ---------------------------------------------------------------------
export type RespuestaInvitacion = "pendiente" | "acepta" | "rechaza";

export interface EventoCalendario {
  id: string;
  titulo: string;
  descripcion: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  todo_el_dia: boolean;
  ubicacion: string | null;
  cliente_id: string | null;
  creado_por: string;
  link_publico_token: string;
  created_at: string;
  updated_at: string;
}

export interface EventoInvitado {
  evento_id: string;
  perfil_id: string;
  respuesta: RespuestaInvitacion;
}

// ---------------------------------------------------------------------
// Tickets internos (departamento o personas puntuales)
// ---------------------------------------------------------------------
export type PrioridadTicket = "baja" | "media" | "alta" | "urgente";
export type EstadoTicket = "abierto" | "en_progreso" | "resuelto" | "cerrado";

export interface Ticket {
  id: string;
  titulo: string;
  descripcion: string | null;
  prioridad: PrioridadTicket;
  estado: EstadoTicket;
  cliente_id: string | null;
  depto_destino: Depto | null;
  asignado_a: string | null;
  creado_por: string;
  resuelto_por: string | null;
  resuelto_en: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketComentario {
  id: string;
  ticket_id: string;
  autor_id: string;
  mensaje: string;
  created_at: string;
}

export const PRIORIDAD_LABEL: Record<PrioridadTicket, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  urgente: "Urgente",
};

export const PRIORIDAD_COLOR: Record<PrioridadTicket, string> = {
  baja: "bg-base-600 text-gray-400",
  media: "bg-signal-info/15 text-signal-info",
  alta: "bg-signal-warn/15 text-signal-warn",
  urgente: "bg-signal-urgent/15 text-signal-urgent",
};

export const ESTADO_TICKET_LABEL: Record<EstadoTicket, string> = {
  abierto: "Abierto",
  en_progreso: "En progreso",
  resuelto: "Resuelto",
  cerrado: "Cerrado",
};

export const ESTADO_TICKET_COLOR: Record<EstadoTicket, string> = {
  abierto: "bg-signal-warn/15 text-signal-warn",
  en_progreso: "bg-signal-info/15 text-signal-info",
  resuelto: "bg-accent/15 text-accent-soft",
  cerrado: "bg-base-600 text-gray-400",
};

// ---------------------------------------------------------------------
// Materiales del cliente (documentos, fotos, etc.)
// ---------------------------------------------------------------------
export interface MaterialCliente {
  id: string;
  cliente_id: string;
  storage_path: string;
  nombre_archivo: string;
  tipo_mime: string | null;
  tamano_bytes: number | null;
  descripcion: string | null;
  subido_por: string | null;
  created_at: string;
}

// Fila de perfiles_departamentos: un departamento adicional de una persona.
export interface PerfilDepartamento {
  perfil_id: string;
  depto: Depto;
}

// Fila de cliente_equipo: una persona asignada a un cliente dentro de un departamento.
// Un mismo cliente puede tener varias filas por el mismo depto (varias personas)
// y varias filas de distintos deptos (varios departamentos atendiendo al mismo cliente).
export interface MiembroEquipoCliente {
  id: string;
  cliente_id: string;
  depto: Depto;
  perfil_id: string;
  perfil?: { nombre_completo: string; avatar_url: string | null } | null;
}

export const DEPTO_LABEL: Record<Depto, string> = {
  ventas: "Ventas",
  analisis: "Análisis",
  estetica: "Estética",
  desarrollo: "Desarrollo",
};

export const DEPTO_COLOR: Record<Depto, string> = {
  ventas: "bg-signal-info/15 text-signal-info",
  analisis: "bg-accent/15 text-accent-soft",
  estetica: "bg-signal-warn/15 text-signal-warn",
  desarrollo: "bg-purple-500/15 text-purple-300",
};

export interface Cliente {
  id: string;
  cliente_codigo: string;
  nombre_contacto: string;
  nombre_empresa: string;
  giro_id: string | null;
  telefono: string;
  email: string | null;
  necesidad_detectada: string;
  fuente_lead: string | null;
  presupuesto_estimado: string | null;
  foto_url: string | null;
  estado: EstadoCliente;
  vendedor_id: string | null;
  analista_id: string | null;
  briefing_texto: string | null;
  briefing_archivo_url: string | null;
  ruta_visual: boolean;
  ruta_software: boolean;
  portal_token: string;
  form_profundidad_token: string | null;
  fecha_entrega_estimada: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tarea {
  id: string;
  cliente_id: string | null; // null = tarea interna/secundaria, no ligada a ningún cliente
  depto: Depto;
  subrol_requerido: ProduccionSubrol | null;
  titulo: string;
  descripcion: string | null;
  estado: EstadoTarea;
  asignado_a: string | null;
  fecha_pactada_entrega: string | null;
  link_entregable: string | null;
  progreso_pct: number;
  tiempo_activo_real_seg: number;
  origen: "automatico" | "manual";
  created_at: string;
}

export const ESTADO_COLOR: Record<EstadoCliente, string> = {
  PROSPECTO: "bg-signal-info/20 text-signal-info",
  TRANSFERIDO: "bg-accent/20 text-accent-soft",
  EN_ANALISIS: "bg-accent/20 text-accent-soft",
  EN_PRODUCCION: "bg-signal-warn/20 text-signal-warn",
  EN_SUPERVISION: "bg-purple-500/20 text-purple-300",
  ENTREGADO: "bg-green-500/20 text-green-400",
  HISTORICO: "bg-base-600 text-gray-400",
};

// ---------------------------------------------------------------------
// Finanzas: banner de ingresos/egresos y flujo de caja
// ---------------------------------------------------------------------
export type TipoMovimientoCaja = "ingreso" | "egreso";

export interface MovimientoCaja {
  id: string;
  tipo: TipoMovimientoCaja;
  categoria: string;
  concepto: string;
  monto: number;
  cliente_id: string | null;
  fecha: string; // YYYY-MM-DD
  registrado_por: string | null;
  created_at: string;
}

export const CATEGORIAS_INGRESO = ["venta", "otro"] as const;
export const CATEGORIAS_EGRESO = ["nomina", "proveedor", "gasto_operativo", "impuestos", "otro"] as const;

// ---------------------------------------------------------------------
// Tiempo de uso diario por persona (gráfica de barras del equipo)
// ---------------------------------------------------------------------
export interface TiempoUsoDiario {
  perfil_id: string;
  fecha: string;
  segundos_activos: number;
}
