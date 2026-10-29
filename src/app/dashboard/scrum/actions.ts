"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { EstadoScrumItem, RolScrum, TipoScrumItem } from "@/lib/types";

export type ResultadoScrum = { error?: string };

const RUTAS = ["/dashboard/scrum", "/dashboard/scrum/backlog", "/dashboard/scrum/sprints"];

function refrescar() {
  RUTAS.forEach((r) => revalidatePath(r));
}

// Los mensajes de las reglas (triggers) llegan en español desde Postgres.
function mensaje(error: { message: string } | null): ResultadoScrum {
  if (!error) {
    refrescar();
    return {};
  }
  if (error.message.includes("uq_sprint_activo")) {
    return { error: "Ya hay un sprint activo. Ciérralo antes de activar otro." };
  }
  return { error: error.message };
}

async function usuarioActual() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, userId: user?.id ?? null };
}

// ---------------------------------------------------------------------
// Backlog / tarjetas
// ---------------------------------------------------------------------
export interface NuevoItemInput {
  titulo: string;
  descripcion?: string;
  criterios?: string;
  tipo: TipoScrumItem;
  epica?: string;
  clienteId?: string | null;
  horasEstimadas?: number | null;
  sprintId?: string | null;
}

export async function crearItem(input: NuevoItemInput): Promise<ResultadoScrum> {
  const titulo = input.titulo.trim();
  if (!titulo) return { error: "Escribe un título." };

  const { supabase, userId } = await usuarioActual();
  if (!userId) return { error: "Sesión expirada." };

  // Va al final de la prioridad: el Product Owner lo reordena después.
  const { data: ultimo } = await supabase
    .from("scrum_items")
    .select("orden")
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("scrum_items").insert({
    titulo,
    descripcion: input.descripcion?.trim() || null,
    criterios: input.criterios?.trim() || null,
    tipo: input.tipo,
    epica: input.epica?.trim() || null,
    cliente_id: input.clienteId || null,
    horas_estimadas: input.horasEstimadas ?? null,
    sprint_id: input.sprintId || null,
    orden: (ultimo?.orden ?? 0) + 10,
    creado_por: userId,
  });
  return mensaje(error);
}

export async function moverItem(id: string, estado: EstadoScrumItem): Promise<ResultadoScrum> {
  const { supabase } = await usuarioActual();
  const { error } = await supabase.from("scrum_items").update({ estado }).eq("id", id);
  return mensaje(error);
}

export interface CamposItem {
  responsable_id?: string | null;
  revisor_id?: string | null;
  horas_estimadas?: number | null;
  horas_reales?: number | null;
  link_pr?: string | null;
  bloqueo?: string | null;
  documentacion?: string | null;
  dod_probado?: boolean;
  dod_pr_revisado?: boolean;
  dod_documentado?: boolean;
}

export async function actualizarItem(id: string, campos: CamposItem): Promise<ResultadoScrum> {
  const { supabase } = await usuarioActual();
  const { error } = await supabase.from("scrum_items").update(campos).eq("id", id);
  return mensaje(error);
}

/** El CTO da el visto bueno y cierra la tarjeta. La base verifica las 4 condiciones. */
export async function aprobarItem(id: string): Promise<ResultadoScrum> {
  const { supabase } = await usuarioActual();
  const { error } = await supabase
    .from("scrum_items")
    .update({ dod_aprobado: true, estado: "hecho" })
    .eq("id", id);
  return mensaje(error);
}

/** El CTO devuelve la tarjeta a trabajo si algo no convence. */
export async function devolverItem(id: string): Promise<ResultadoScrum> {
  const { supabase } = await usuarioActual();
  const { error } = await supabase
    .from("scrum_items")
    .update({ estado: "en_progreso", dod_aprobado: false })
    .eq("id", id);
  return mensaje(error);
}

export async function asignarASprint(id: string, sprintId: string | null): Promise<ResultadoScrum> {
  const { supabase } = await usuarioActual();
  const { error } = await supabase.from("scrum_items").update({ sprint_id: sprintId }).eq("id", id);
  return mensaje(error);
}

/** Sube o baja una tarjeta intercambiando su orden con la vecina del backlog. */
export async function reordenarItem(id: string, direccion: "arriba" | "abajo"): Promise<ResultadoScrum> {
  const { supabase } = await usuarioActual();
  const { data: lista, error } = await supabase
    .from("scrum_items")
    .select("id, orden")
    .is("sprint_id", null)
    .order("orden", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) return { error: error.message };

  const filas = lista || [];
  const i = filas.findIndex((f) => f.id === id);
  const j = direccion === "arriba" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= filas.length) return {};

  // Renumera de 10 en 10 para evitar empates y luego intercambia las dos.
  const nuevos = filas.map((f, idx) => ({ id: f.id, orden: (idx + 1) * 10 }));
  [nuevos[i].orden, nuevos[j].orden] = [nuevos[j].orden, nuevos[i].orden];

  for (const n of nuevos) {
    const original = filas.find((f) => f.id === n.id);
    if (original && original.orden === n.orden) continue;
    const { error: e } = await supabase.from("scrum_items").update({ orden: n.orden }).eq("id", n.id);
    if (e) return mensaje(e);
  }
  refrescar();
  return {};
}

export async function eliminarItem(id: string): Promise<ResultadoScrum> {
  const { supabase } = await usuarioActual();
  const { error } = await supabase.from("scrum_items").delete().eq("id", id);
  return mensaje(error);
}

// ---------------------------------------------------------------------
// Sprints
// ---------------------------------------------------------------------
export interface NuevoSprintInput {
  nombre: string;
  objetivo?: string;
  fechaInicio: string;
  fechaFin: string;
  colchonPct: number;
  pctClientes: number;
}

export async function crearSprint(input: NuevoSprintInput): Promise<ResultadoScrum> {
  if (!input.nombre.trim()) return { error: "Ponle nombre al sprint." };
  if (!input.fechaInicio || !input.fechaFin) return { error: "Indica fecha de inicio y de fin." };

  const { supabase, userId } = await usuarioActual();
  const { error } = await supabase.from("sprints").insert({
    nombre: input.nombre.trim(),
    objetivo: input.objetivo?.trim() || null,
    fecha_inicio: input.fechaInicio,
    fecha_fin: input.fechaFin,
    colchon_pct: input.colchonPct,
    pct_clientes: input.pctClientes,
    creado_por: userId,
  });
  return mensaje(error);
}

export async function activarSprint(id: string): Promise<ResultadoScrum> {
  const { supabase } = await usuarioActual();
  const { error } = await supabase.from("sprints").update({ estado: "activo" }).eq("id", id);
  return mensaje(error);
}

export async function cerrarSprint(
  id: string,
  retro: { bien: string; mal: string; mejorar: string }
): Promise<ResultadoScrum> {
  const { supabase } = await usuarioActual();
  const { error } = await supabase.rpc("fn_scrum_cerrar_sprint", {
    p_sprint_id: id,
    p_bien: retro.bien.trim() || null,
    p_mal: retro.mal.trim() || null,
    p_mejorar: retro.mejorar.trim() || null,
  });
  return mensaje(error);
}

// ---------------------------------------------------------------------
// Daily escrito
// ---------------------------------------------------------------------
export async function guardarDaily(
  sprintId: string,
  datos: { ayer: string; hoy: string; bloqueos: string }
): Promise<ResultadoScrum> {
  const { supabase, userId } = await usuarioActual();
  if (!userId) return { error: "Sesión expirada." };

  const { error } = await supabase.from("scrum_dailies").upsert(
    {
      sprint_id: sprintId,
      perfil_id: userId,
      fecha: new Date().toLocaleDateString("en-CA"), // YYYY-MM-DD en hora local
      ayer: datos.ayer.trim() || null,
      hoy: datos.hoy.trim() || null,
      bloqueos: datos.bloqueos.trim() || null,
    },
    { onConflict: "sprint_id,perfil_id,fecha" }
  );
  return mensaje(error);
}

// ---------------------------------------------------------------------
// Equipo Scrum (solo Root / CEO por RLS)
// ---------------------------------------------------------------------
export async function guardarMiembro(input: {
  perfilId: string;
  rol: RolScrum;
  horasSemana: number;
  factor: number;
}): Promise<ResultadoScrum> {
  const { supabase } = await usuarioActual();
  const { error } = await supabase.from("scrum_equipo").upsert({
    perfil_id: input.perfilId,
    rol_scrum: input.rol,
    horas_semana: input.horasSemana,
    factor_dedicacion: input.factor,
  });
  return mensaje(error);
}

export async function quitarMiembro(perfilId: string): Promise<ResultadoScrum> {
  const { supabase } = await usuarioActual();
  const { error } = await supabase.from("scrum_equipo").delete().eq("perfil_id", perfilId);
  return mensaje(error);
}
