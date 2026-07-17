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
  depto: Depto | null;
  activo: boolean;
  nota_solicitud?: string | null;
  avatar_url: string | null;
}

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
  cliente_id: string;
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
