"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Depto } from "@/lib/types";

// Solo Root/CEO pueden editar el equipo de un cliente (misma regla que
// reasignarResponsables en cliente/actions.ts). El resto de roles solo
// puede leer (política RLS cliente_equipo_select_encargados).
async function asegurarRootOCeo() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: miPerfil } = await supabase.from("perfiles").select("role").eq("id", user.id).single();
  if (miPerfil?.role !== "root" && miPerfil?.role !== "ceo") {
    throw new Error("Solo Root o CEO pueden editar el equipo asignado a un cliente.");
  }
  return { supabase, user };
}

// Agrega a una persona al equipo de un cliente dentro de un departamento.
// Se puede llamar varias veces con distintas personas para el mismo
// (cliente, depto): eso es justamente lo que permite tener 2+ personas
// del mismo departamento atendiendo al mismo cliente.
export async function agregarMiembroEquipo(clienteId: string, depto: Depto, perfilId: string) {
  const { supabase, user } = await asegurarRootOCeo();

  const { error } = await supabase
    .from("cliente_equipo")
    .upsert({ cliente_id: clienteId, depto, perfil_id: perfilId, asignado_por: user.id }, { onConflict: "cliente_id,depto,perfil_id" });
  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/cliente/${clienteId}`);
  revalidatePath("/dashboard/root/clientes");
}

// Quita a una persona del equipo de un cliente en un departamento puntual
// (no afecta su asignación en otros departamentos del mismo cliente).
export async function quitarMiembroEquipo(clienteId: string, depto: Depto, perfilId: string) {
  const { supabase } = await asegurarRootOCeo();

  const { error } = await supabase
    .from("cliente_equipo")
    .delete()
    .eq("cliente_id", clienteId)
    .eq("depto", depto)
    .eq("perfil_id", perfilId);
  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/cliente/${clienteId}`);
  revalidatePath("/dashboard/root/clientes");
}

// Reemplaza de una sola vez la lista completa de personas asignadas a un
// (cliente, depto). Útil para un selector múltiple: se le manda el arreglo
// final de ids y la función calcula altas/bajas internamente.
export async function definirEquipoDepartamento(clienteId: string, depto: Depto, perfilIds: string[]) {
  const { supabase, user } = await asegurarRootOCeo();

  const { data: actuales, error: errLectura } = await supabase
    .from("cliente_equipo")
    .select("perfil_id")
    .eq("cliente_id", clienteId)
    .eq("depto", depto);
  if (errLectura) throw new Error(errLectura.message);

  const actualesIds = new Set((actuales || []).map((r) => r.perfil_id));
  const nuevosIds = new Set(perfilIds);

  const aAgregar = perfilIds.filter((id) => !actualesIds.has(id));
  const aQuitar = [...actualesIds].filter((id) => !nuevosIds.has(id));

  if (aAgregar.length > 0) {
    const { error } = await supabase
      .from("cliente_equipo")
      .upsert(
        aAgregar.map((perfil_id) => ({ cliente_id: clienteId, depto, perfil_id, asignado_por: user.id })),
        { onConflict: "cliente_id,depto,perfil_id" }
      );
    if (error) throw new Error(error.message);
  }

  if (aQuitar.length > 0) {
    const { error } = await supabase
      .from("cliente_equipo")
      .delete()
      .eq("cliente_id", clienteId)
      .eq("depto", depto)
      .in("perfil_id", aQuitar);
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/dashboard/cliente/${clienteId}`);
  revalidatePath("/dashboard/root/clientes");
}
