"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { notificarPerfilesCRM } from "@/lib/notificaciones";
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

// Avisa (campanita interna + correo) a la persona a la que se le acaba de
// asignar una tarea, dándole contexto de qué se le pide. Mismo patrón que
// se usa para tickets y eventos de calendario. Envuelto en try/catch: un
// fallo de notificación (falta RESEND_API_KEY, etc.) nunca debe tumbar la
// creación de la tarea en sí.
async function notificarAsignacionTarea(params: {
  asignadoA: string;
  asignadorId: string;
  asignadorNombre: string;
  titulo: string;
  descripcion?: string | null;
  fechaPactadaEntrega?: string | null;
  clienteId?: string | null;
}) {
  const mensaje = `${params.asignadorNombre} te asignó esta tarea${
    params.fechaPactadaEntrega ? ` · Entrega: ${new Date(params.fechaPactadaEntrega).toLocaleDateString("es-MX", { day: "numeric", month: "long" })}` : ""
  }`;

  await notificarPerfilesCRM({
    perfilIds: [params.asignadoA],
    remitenteId: params.asignadorId,
    tipo: "tarea_asignada",
    titulo: `Nueva tarea asignada: ${params.titulo}`,
    mensaje,
    detalle: params.descripcion,
    clienteId: params.clienteId,
  });
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
  const { supabase, user } = await asegurarRootOCeo();

  if (!input.titulo.trim()) throw new Error("El título es obligatorio.");
  if (!input.asignadoA) throw new Error("Debes elegir a quién se le asigna la tarea.");

  const { error } = await supabase.from("tareas").insert({
    cliente_id: input.clienteId || null,
    depto: input.depto,
    subrol_requerido: input.subrolRequerido || null,
    titulo: input.titulo.trim(),
    descripcion: input.descripcion?.trim() || null,
    asignado_a: input.asignadoA,
    creado_por: user.id,
    asignado_automaticamente: false,
    origen: "manual",
    fecha_pactada_entrega: input.fechaPactadaEntrega || null,
  });
  if (error) throw new Error(error.message);

  const { data: miPerfil } = await supabase.from("perfiles").select("nombre_completo").eq("id", user.id).single();
  await notificarAsignacionTarea({
    asignadoA: input.asignadoA,
    asignadorId: user.id,
    asignadorNombre: miPerfil?.nombre_completo || "Alguien del equipo",
    titulo: input.titulo.trim(),
    descripcion: input.descripcion,
    fechaPactadaEntrega: input.fechaPactadaEntrega,
    clienteId: input.clienteId,
  });

  revalidatePath("/dashboard/ceo/tareas");
  revalidatePath("/dashboard/mis-tareas");
  revalidatePath(`/dashboard/${input.depto}`);
}
