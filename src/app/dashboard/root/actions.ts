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

// Reemplaza de una sola vez TODOS los departamentos adicionales de una
// persona (además de su depto principal en `perfiles.depto`). Con esto
// una persona puede pertenecer a varios departamentos al mismo tiempo
// (ej. Análisis + Desarrollo), y aparecerá en las listas de asignación
// de todos ellos.
export async function actualizarDepartamentosExtra(perfilId: string, deptos: string[]) {
  const supabase = createClient();

  const { data: actuales, error: errLectura } = await supabase
    .from("perfiles_departamentos")
    .select("depto")
    .eq("perfil_id", perfilId);
  if (errLectura) throw new Error(errLectura.message);

  const actualesSet = new Set((actuales || []).map((r) => r.depto));
  const nuevosSet = new Set(deptos);

  const aAgregar = deptos.filter((d) => !actualesSet.has(d));
  const aQuitar = [...actualesSet].filter((d) => !nuevosSet.has(d));

  if (aAgregar.length > 0) {
    const { error } = await supabase
      .from("perfiles_departamentos")
      .upsert(aAgregar.map((depto) => ({ perfil_id: perfilId, depto })), { onConflict: "perfil_id,depto" });
    if (error) throw new Error(error.message);
  }

  if (aQuitar.length > 0) {
    const { error } = await supabase
      .from("perfiles_departamentos")
      .delete()
      .eq("perfil_id", perfilId)
      .in("depto", aQuitar);
    if (error) throw new Error(error.message);
  }

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
//
// IMPORTANTE: esta función regresa { error } en vez de hacer `throw`.
// Next.js oculta en producción el mensaje real de cualquier error que
// se lance ("throw") desde una Server Action — el cliente solo recibe
// un texto genérico ("An error occurred in the Server Components
// render...") sin importar cuál haya sido el problema real. Regresando
// el error como dato normal (igual que ya hace src/app/dashboard/tickets/actions.ts),
// el mensaje real sí llega intacto a la UI.
export async function eliminarUsuario(perfilId: string): Promise<{ error: string | null }> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado" };

    if (perfilId === user.id) {
      return { error: "No puedes eliminar tu propia cuenta." };
    }

    const { data: miPerfil } = await supabase.from("perfiles").select("role").eq("id", user.id).single();
    if (miPerfil?.role !== "root") {
      return { error: "Solo Root puede eliminar usuarios." };
    }

    const service = createServiceClient();
    const { error, data } = await service.auth.admin.deleteUser(perfilId);
    console.log("[root] eliminarUsuario resultado:", { perfilId, error, data });
    if (error) {
      // error.message a veces no es enumerable (por eso se veía "{}" en el
      // alert del cliente al viajar por la Server Action) — forzamos a
      // texto plano explícitamente.
      const msg = typeof error.message === "string" && error.message ? error.message : `Error de Supabase (status ${(error as any).status ?? "desconocido"})`;
      return { error: msg };
    }

    revalidatePath("/dashboard/root");
    return { error: null };
  } catch (err: any) {
    const msg = typeof err?.message === "string" && err.message ? err.message : "No se pudo eliminar. Revisa los logs del servidor en Vercel para más detalle.";
    console.error("[root] eliminarUsuario falló:", err);
    return { error: msg };
  }
}