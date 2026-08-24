"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { enviarEmail } from "@/lib/email";
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
  asignadorNombre: string;
  titulo: string;
  descripcion?: string | null;
  fechaPactadaEntrega?: string | null;
}) {
  try {
    const admin = createServiceClient();

    const mensaje = `${params.asignadorNombre} te asignó esta tarea${
      params.fechaPactadaEntrega ? ` · Entrega: ${new Date(params.fechaPactadaEntrega).toLocaleDateString("es-MX", { day: "numeric", month: "long" })}` : ""
    }`;

    const { error: errNotif } = await admin.from("notificaciones").insert({
      destinatario_id: params.asignadoA,
      tipo: "tarea_asignada",
      titulo: `Nueva tarea: ${params.titulo}`,
      mensaje,
    });
    if (errNotif) console.error("[tareas] No se pudo insertar la notificación:", errNotif.message);

    const { data, error: errUser } = await admin.auth.admin.getUserById(params.asignadoA);
    if (errUser) console.error("[tareas] No se pudo obtener el correo de", params.asignadoA, errUser.message);

    if (data?.user?.email) {
      await enviarEmail({
        to: [data.user.email],
        subject: `Nueva tarea asignada: ${params.titulo}`,
        html: `
          <div style="font-family:sans-serif;color:#111">
            <h2 style="margin-bottom:4px">${params.titulo}</h2>
            <p style="color:#555;margin-top:0">${mensaje}</p>
            ${params.descripcion ? `<p>${params.descripcion}</p>` : ""}
            <p style="color:#888;font-size:13px">Asignada por ${params.asignadorNombre} · GRESANOVA OS</p>
          </div>
        `,
      });
    }
  } catch (err: any) {
    console.error("[tareas] notificarAsignacionTarea falló, se ignora para no romper la acción principal:", err?.message || err);
  }
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
    asignadorNombre: miPerfil?.nombre_completo || "Alguien del equipo",
    titulo: input.titulo.trim(),
    descripcion: input.descripcion,
    fechaPactadaEntrega: input.fechaPactadaEntrega,
  });

  revalidatePath("/dashboard/ceo/tareas");
  revalidatePath("/dashboard/mis-tareas");
  revalidatePath(`/dashboard/${input.depto}`);
}
