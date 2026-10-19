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

export async function eliminarTareaEstetica(
  tareaId: string,
  depto: "estetica" | "desarrollo"
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: perfil } = await supabase.from("perfiles").select("role").eq("id", user.id).single();
  if (perfil?.role !== "root") return { error: "Solo Root puede eliminar tareas de producción." };

  const { data: tarea, error: errorTarea } = await supabase
    .from("tareas")
    .select("cliente_id")
    .eq("id", tareaId)
    .eq("depto", depto)
    .maybeSingle();
  if (errorTarea) return { error: errorTarea.message };
  if (!tarea) return { error: "No se encontró la tarea en este departamento." };

  const { data: eliminada, error } = await supabase
    .from("tareas")
    .delete()
    .eq("id", tareaId)
    .eq("depto", depto)
    .select("id")
    .maybeSingle();
  if (error) return { error: error.message };
  if (!eliminada) return { error: "No se pudo eliminar la tarea." };

  revalidatePath(`/dashboard/${depto}`);
  revalidatePath("/dashboard/mis-tareas");
  revalidatePath("/dashboard/ceo/tareas");
  if (tarea.cliente_id) revalidatePath(`/dashboard/cliente/${tarea.cliente_id}`);
  return { error: null };
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
