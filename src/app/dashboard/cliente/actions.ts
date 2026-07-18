"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// Mueve a un cliente entre etapas/departamentos: "avanzar", "retroceder" o
// "mantener" (mantener no llama a esto — el botón simplemente no hace nada).
// La validación de permisos (Root/CEO libre; encargados solo un paso) vive
// en la función de base de datos fn_cambiar_estado_cliente.
export async function cambiarEtapaCliente(clienteId: string, nuevoEstado: string, comentario?: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("fn_cambiar_estado_cliente", {
    p_cliente_id: clienteId,
    p_nuevo_estado: nuevoEstado,
    p_comentario: comentario || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/cliente/${clienteId}`);
  revalidatePath("/dashboard/ceo");
  revalidatePath("/dashboard/vista-aguila");
  revalidatePath("/dashboard/root/clientes");
}

// Root/CEO define o cambia quién es el vendedor y/o el analista responsable
// de un cliente. La política RLS `clientes_root_ceo_update` ya restringe
// esto a esos dos roles; aquí solo validamos explícitamente para dar un
// mensaje de error claro en vez de un error genérico de RLS.
export async function reasignarResponsables(clienteId: string, vendedorId: string | null, analistaId: string | null) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: miPerfil } = await supabase.from("perfiles").select("role").eq("id", user.id).single();
  if (miPerfil?.role !== "root" && miPerfil?.role !== "ceo") {
    throw new Error("Solo Root o CEO pueden reasignar responsables.");
  }

  const { error } = await supabase
    .from("clientes")
    .update({ vendedor_id: vendedorId, analista_id: analistaId })
    .eq("id", clienteId);
  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/cliente/${clienteId}`);
  revalidatePath("/dashboard/root/clientes");
}

export async function eliminarCliente(clienteId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: miPerfil } = await supabase.from("perfiles").select("role").eq("id", user.id).single();
  if (miPerfil?.role !== "root") {
    throw new Error("Solo Root puede eliminar clientes.");
  }

  // El DELETE en cascada de la base de datos se lleva de paso: tareas,
  // bitácora, credenciales de bóveda, chat, historial de etapas y
  // alertas de duplicados de ese cliente (todos con ON DELETE CASCADE).
  const { error } = await supabase.from("clientes").delete().eq("id", clienteId);
  if (error) throw new Error(error.message);

  redirect("/dashboard");
}
