"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { notificarPerfilesCRM } from "@/lib/notificaciones";
import type { RespuestaTarea } from "@/lib/types";

// Solo quien tiene la tarea asignada puede mover su propia respuesta —
// la RLS de `tareas` ya lo exige (asignado_a = auth.uid()), aquí solo
// además dejamos registro en el historial y, si aplica, concatenamos el
// entregable a los materiales del cliente.
export async function actualizarRespuestaTarea(
  tareaId: string,
  nuevaRespuesta: RespuestaTarea,
  opciones?: { comentario?: string; linkEntregable?: string }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  if (nuevaRespuesta === "finalizado" && !opciones?.linkEntregable) {
    throw new Error("Para finalizar necesitas anexar el link del entregable.");
  }

  const { data: tarea, error: errLectura } = await supabase
    .from("tareas")
    .select("id, titulo, cliente_id, creado_por, link_entregable")
    .eq("id", tareaId)
    .single();
  if (errLectura || !tarea) throw new Error("No se encontró la tarea.");

  const patch: Record<string, any> = { respuesta_estado: nuevaRespuesta };
  if (opciones?.linkEntregable) patch.link_entregable = opciones.linkEntregable;

  const { error } = await supabase.from("tareas").update(patch).eq("id", tareaId);
  if (error) throw new Error(error.message);

  const { error: errHistorial } = await supabase.from("tarea_respuesta_historial").insert({
    tarea_id: tareaId,
    perfil_id: user.id,
    respuesta_estado: nuevaRespuesta,
    comentario: opciones?.comentario?.trim() || null,
    link_entregable: opciones?.linkEntregable || null,
  });
  if (errHistorial) throw new Error(errHistorial.message);

  // Si la tarea está ligada a un cliente y se finalizó con un link, ese
  // material queda concatenado automáticamente al expediente del cliente
  // (misma sección de "Materiales" que ya ve todo su equipo).
  const linkFinal = opciones?.linkEntregable || tarea.link_entregable;
  if (nuevaRespuesta === "finalizado" && tarea.cliente_id && linkFinal) {
    const { error: errMaterial } = await supabase.from("materiales_cliente").insert({
      cliente_id: tarea.cliente_id,
      link_url: linkFinal,
      nombre_archivo: `Entregable — ${tarea.titulo}`,
      descripcion: `Generado automáticamente al finalizar la tarea "${tarea.titulo}".`,
      tarea_id: tareaId,
      subido_por: user.id,
    });
    if (errMaterial) console.error("[tareas] no se pudo concatenar el material al cliente:", errMaterial);
  }

  // Avisa a quien asignó la tarea (si la creó alguien específico) de que hubo movimiento.
  if (tarea.creado_por && tarea.creado_por !== user.id) {
    const { data: miPerfil } = await supabase.from("perfiles").select("nombre_completo").eq("id", user.id).single();
    await notificarPerfilesCRM({
      perfilIds: [tarea.creado_por],
      remitenteId: user.id,
      tipo: "tarea_respuesta",
      titulo: `"${tarea.titulo}" ahora está: ${nuevaRespuesta.replace("_", " ")}`,
      mensaje: `${miPerfil?.nombre_completo || "Alguien del equipo"} actualizó el estado de la tarea que le asignaste.`,
      detalle: linkFinal ? `Entregable: ${linkFinal}` : opciones?.comentario,
      clienteId: tarea.cliente_id,
    });
  }

  revalidatePath("/dashboard/mis-tareas");
  revalidatePath("/dashboard/ceo/tareas");
  if (tarea.cliente_id) revalidatePath(`/dashboard/cliente/${tarea.cliente_id}`);
}
