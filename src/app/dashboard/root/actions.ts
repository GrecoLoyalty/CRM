"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function definirMetas(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const mes = new Date();
  mes.setDate(1);

  const { error } = await supabase.from("metas_mensuales").upsert(
    {
      mes: mes.toISOString().slice(0, 10),
      facturacion_objetivo: Number(formData.get("facturacion_objetivo")),
      clientes_nuevos_objetivo: Number(formData.get("clientes_nuevos_objetivo")),
      reseteo_automatico: formData.get("reseteo_automatico") === "on",
      set_by: user!.id,
    },
    { onConflict: "mes" }
  );

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/root");
}

export async function actualizarRol(perfilId: string, role: string, depto: string | null, subrol: string | null) {
  const supabase = createClient();
  const { error } = await supabase
    .from("perfiles")
    .update({ role, depto: depto || null, subrol: subrol || null })
    .eq("id", perfilId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/root");
}

export async function alternarActivo(perfilId: string, activo: boolean) {
  const supabase = createClient();
  const { error } = await supabase.from("perfiles").update({ activo }).eq("id", perfilId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/root");
}

// Elimina una cuenta por completo: borra el usuario de Supabase Auth
// (lo que en cascada borra su fila en `perfiles` gracias al FK con
// ON DELETE CASCADE). Sirve tanto para rechazar solicitudes pendientes
// como para dar de baja a un usuario ya activo.
export async function eliminarUsuario(perfilId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  if (perfilId === user.id) {
    throw new Error("No puedes eliminar tu propia cuenta.");
  }

  const { data: miPerfil } = await supabase.from("perfiles").select("role").eq("id", user.id).single();
  if (miPerfil?.role !== "root") {
    throw new Error("Solo Root puede eliminar usuarios.");
  }

  const service = createServiceClient();
  const { error } = await service.auth.admin.deleteUser(perfilId);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/root");
}
