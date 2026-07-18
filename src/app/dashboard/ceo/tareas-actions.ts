"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Depto, ProduccionSubrol } from "@/lib/types";

async function asegurarRootOCeo() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: miPerfil } = await supabase.from("perfiles").select("role").eq("id", user.id).single();
  if (miPerfil?.role !== "root" && miPerfil?.role !== "ceo") {
    throw new Error("Solo Root o CEO pueden asignar tareas directamente.");
  }
  return { supabase, user };
}

// Crea una tarea "suelta": Root/CEO se la asignan directamente a alguien,
// sin pasar por el flujo automático de briefing/cadena de producción.
// clienteId es opcional: si no se manda, es una tarea interna/secundaria
// (administrativa, capacitación, etc.) que no aparece ligada a ningún cliente.
export async function crearTareaManual(input: {
  titulo: string;
  descripcion?: string;
  asignadoA: string;
  depto: Depto;
  subrolRequerido?: ProduccionSubrol | null;
  clienteId?: string | null;
  fechaPactadaEntrega?: string | null;
}) {
  const { supabase } = await asegurarRootOCeo();

  if (!input.titulo.trim()) throw new Error("El título es obligatorio.");
  if (!input.asignadoA) throw new Error("Debes elegir a quién se le asigna la tarea.");

  const { error } = await supabase.from("tareas").insert({
    cliente_id: input.clienteId || null,
    depto: input.depto,
    subrol_requerido: input.subrolRequerido || null,
    titulo: input.titulo.trim(),
    descripcion: input.descripcion?.trim() || null,
    asignado_a: input.asignadoA,
    asignado_automaticamente: false,
    origen: "manual",
    fecha_pactada_entrega: input.fechaPactadaEntrega || null,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/ceo/tareas");
  revalidatePath(`/dashboard/${input.depto}`);
}
