"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Root/CEO reasignan quién ejecuta una tarea de producción (Estética o
// Desarrollo). La política `tareas_root_ceo_update` ya permite esto vía RLS;
// aquí solo validamos el rol para dar un mensaje de error claro.
export async function reasignarTareaEncargado(tareaId: string, nuevoAsignadoId: string | null) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: miPerfil } = await supabase.from("perfiles").select("role").eq("id", user.id).single();
  if (miPerfil?.role !== "root" && miPerfil?.role !== "ceo") {
    throw new Error("Solo Root o CEO pueden reasignar tareas.");
  }

  const { error } = await supabase
    .from("tareas")
    .update({ asignado_a: nuevoAsignadoId, asignado_automaticamente: false })
    .eq("id", tareaId);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/root/clientes");
}
