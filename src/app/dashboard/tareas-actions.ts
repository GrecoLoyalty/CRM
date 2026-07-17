"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { EstadoTarea } from "@/lib/types";

export async function actualizarEstadoTarea(tareaId: string, nuevoEstado: EstadoTarea, linkEntregable?: string, path?: string) {
  const supabase = createClient();
  const update: Record<string, any> = { estado: nuevoEstado, updated_at: new Date().toISOString() };
  if (linkEntregable) update.link_entregable = linkEntregable;
  if (nuevoEstado === "COMPLETADA" || nuevoEstado === "PUBLICADO") update.completada_at = new Date().toISOString();

  const { error } = await supabase.from("tareas").update(update).eq("id", tareaId);
  if (error) throw new Error(error.message);
  revalidatePath(path || "/dashboard");
}

// Ping de actividad — llamado cada 60s desde el navegador mientras hay interacción
// (mousemove/keypress/scroll) para calcular Tiempo Activo Real vs Tiempo Total Abierta.
export async function pingActividad(tareaId: string) {
  const supabase = createClient();
  const { data: tarea } = await supabase.from("tareas").select("ultimo_ping_at, tiempo_activo_real_seg, tiempo_total_abierta_seg").eq("id", tareaId).single();
  if (!tarea) return;

  const ahora = new Date();
  const ultimoPing = tarea.ultimo_ping_at ? new Date(tarea.ultimo_ping_at) : ahora;
  const deltaSeg = Math.min(60, Math.floor((ahora.getTime() - ultimoPing.getTime()) / 1000));

  await supabase
    .from("tareas")
    .update({
      ultimo_ping_at: ahora.toISOString(),
      tiempo_activo_real_seg: (tarea.tiempo_activo_real_seg || 0) + Math.max(0, deltaSeg),
      tiempo_total_abierta_seg: (tarea.tiempo_total_abierta_seg || 0) + 60,
    })
    .eq("id", tareaId);
}
