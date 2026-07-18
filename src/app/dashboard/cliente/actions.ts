"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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
