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

export async function guardarConfiguracionEmpresa(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: perfil } = await supabase.from("perfiles").select("role").eq("id", user.id).single();
  if (perfil?.role !== "root") throw new Error("Solo Root puede editar la información de la empresa.");

  const numero = (campo: string) => Number(formData.get(campo));
  const costosFijos = numero("costos_fijos_mensuales");
  const costosVariablesPct = numero("costos_variables_pct");
  const tasaImpuestosPct = numero("tasa_impuestos_pct");
  if (!Number.isFinite(costosFijos) || costosFijos < 0) throw new Error("Los costos fijos deben ser cero o mayores.");
  if (!Number.isFinite(costosVariablesPct) || costosVariablesPct < 0 || costosVariablesPct >= 100) {
    throw new Error("El porcentaje de costos variables debe estar entre 0 y 99.99.");
  }
  if (!Number.isFinite(tasaImpuestosPct) || tasaImpuestosPct < 0 || tasaImpuestosPct > 100) {
    throw new Error("La tasa fiscal debe estar entre 0 y 100.");
  }

  const nombre = String(formData.get("nombre_empresa") || "").trim();
  if (!nombre) throw new Error("El nombre de la empresa es obligatorio.");

  const { error } = await supabase.from("empresa_configuracion").upsert({
    id: "principal",
    nombre_empresa: nombre,
    giro: String(formData.get("giro") || "").trim(),
    telefono: String(formData.get("telefono") || "").trim(),
    correo: String(formData.get("correo") || "").trim(),
    sitio_web: String(formData.get("sitio_web") || "").trim(),
    direccion: String(formData.get("direccion") || "").trim(),
    moneda: String(formData.get("moneda") || "MXN"),
    costos_fijos_mensuales: costosFijos,
    costos_variables_pct: costosVariablesPct,
    tasa_impuestos_pct: tasaImpuestosPct,
    updated_by: user.id,
  }, { onConflict: "id" });
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/root/empresa");
}

export async function actualizarRol(perfilId: string, role: string, depto: string | null, subrol: string | null) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  const { data: miPerfil, error: errorPerfil } = await supabase.from("perfiles").select("role").eq("id", user.id).single();
  if (errorPerfil) throw new Error(errorPerfil.message);
  if (miPerfil.role !== "root") throw new Error("Solo Root puede cambiar los roles.");
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

async function exigirRoot() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  const { data: miPerfil } = await supabase.from("perfiles").select("role").eq("id", user.id).single();
  if (miPerfil?.role !== "root") throw new Error("Solo Root puede administrar accesos.");
  return { supabase, user };
}

// Bloquea o desbloquea el inicio de sesión en Supabase Auth. Si falta la
// service key (o falla), no se interrumpe nada: `perfiles.activo = false`
// ya impide entrar al CRM, esto solo refuerza el bloqueo.
async function bloquearInicioDeSesion(perfilId: string, bloquear: boolean) {
  try {
    const admin = createServiceClient();
    await admin.auth.admin.updateUserById(perfilId, { ban_duration: bloquear ? "876000h" : "none" });
  } catch (err) {
    console.error("[root] No se pudo actualizar el bloqueo de Auth:", err);
  }
}

// Aprueba una solicitud de acceso (o reactiva a alguien dado de baja).
export async function alternarActivo(perfilId: string, activo: boolean) {
  const { supabase } = await exigirRoot();
  const cambios = activo ? { activo: true, dado_de_baja_at: null } : { activo: false, dado_de_baja_at: new Date().toISOString() };
  const { error } = await supabase.from("perfiles").update(cambios).eq("id", perfilId);
  if (error) throw new Error(error.message);
  await bloquearInicioDeSesion(perfilId, !activo);
  revalidatePath("/dashboard/root");
}

export async function reactivarUsuario(perfilId: string): Promise<{ error: string | null }> {
  try {
    await alternarActivo(perfilId, true);
    return { error: null };
  } catch (err: any) {
    return { error: err?.message || "No se pudo reactivar al usuario." };
  }
}

// Baja del equipo (o rechazo de una solicitud). La persona queda marcada
// con `dado_de_baja_at`: pierde el acceso, deja de aparecer en Solicitudes
// pendientes y en las listas de asignación, y se conserva todo su historial
// (tareas, tickets, auditoría) sin borrar la cuenta.
//
// Regresa { error } en vez de hacer `throw`: Next.js oculta en producción el
// mensaje real de cualquier error lanzado desde una Server Action.
export async function eliminarUsuario(perfilId: string): Promise<{ error: string | null }> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado" };

    if (perfilId === user.id) {
      return { error: "No puedes darte de baja a ti mismo." };
    }

    const { data: miPerfil } = await supabase.from("perfiles").select("role").eq("id", user.id).single();
    if (miPerfil?.role !== "root") {
      return { error: "Solo Root puede dar de baja usuarios." };
    }

    const { error } = await supabase
      .from("perfiles")
      .update({ activo: false, dado_de_baja_at: new Date().toISOString() })
      .eq("id", perfilId);
    if (error) {
      const msg = typeof error.message === "string" && error.message ? error.message : `Error de Supabase (status ${(error as any).status ?? "desconocido"})`;
      return { error: msg };
    }

    await bloquearInicioDeSesion(perfilId, true);

    revalidatePath("/dashboard/root");
    return { error: null };
  } catch (err: any) {
    const msg = typeof err?.message === "string" && err.message ? err.message : "No se pudo dar de baja. Revisa los logs del servidor en Vercel para más detalle.";
    console.error("[root] eliminarUsuario falló:", err);
    return { error: msg };
  }
}
