import { createServiceClient } from "@/lib/supabase/server";
import { crearEventoGoogle, actualizarEventoGoogle, eliminarEventoGoogle } from "./calendar";

export interface AgendaPersonalGoogleInput {
  titulo: string;
  fechaInicio: string;
  fechaFin: string;
  estado: "ocupado" | "disponible";
  estadoBloque?: "pendiente" | "listo";
  notas?: string | null;
  ubicacion?: string | null;
  alguienIraConmigo?: string | null;
  recordatorio?: string | null;
}

export function datosGoogleAgenda(input: AgendaPersonalGoogleInput) {
  const descripcion = [
    `Disponibilidad: ${input.estado === "disponible" ? "Disponible" : "Ocupado"}`,
    input.estadoBloque ? `Estado del bloque: ${input.estadoBloque}` : null,
    input.alguienIraConmigo ? `Acompañante: ${input.alguienIraConmigo}` : null,
    input.recordatorio ? `Recordatorio: ${input.recordatorio}` : null,
    input.notas ? `Notas: ${input.notas}` : null,
  ].filter(Boolean).join("\n");

  return {
    titulo: input.titulo.trim(),
    descripcion,
    fechaInicio: input.fechaInicio,
    fechaFin: input.fechaFin,
    ubicacion: input.ubicacion?.trim() || null,
    transparencia: input.estado === "disponible" ? "transparent" as const : "opaque" as const,
  };
}

export async function sincronizarBloqueGoogle(
  perfilId: string,
  input: AgendaPersonalGoogleInput,
  googleEventId?: string | null
) {
  const payload = datosGoogleAgenda(input);
  if (googleEventId) {
    const actualizado = await actualizarEventoGoogle(perfilId, googleEventId, payload);
    return { googleEventId, sincronizado: actualizado };
  }

  const nuevoId = await crearEventoGoogle(perfilId, payload);
  return { googleEventId: nuevoId, sincronizado: !!nuevoId };
}

export async function sincronizarAgendaPersonalPendiente(perfilId: string) {
  const admin = createServiceClient();
  const { data: bloques, error } = await admin
    .from("agenda_personal")
    .select("*")
    .eq("perfil_id", perfilId)
    .is("google_event_id", null)
    .order("fecha_inicio");

  if (error) throw new Error(error.message);
  let sincronizados = 0;
  for (const bloque of bloques || []) {
    const resultado = await sincronizarBloqueGoogle(perfilId, {
      titulo: bloque.titulo,
      fechaInicio: bloque.fecha_inicio,
      fechaFin: bloque.fecha_fin,
      estado: bloque.estado,
      estadoBloque: bloque.estado_bloque,
      notas: bloque.notas,
      ubicacion: bloque.ubicacion,
      alguienIraConmigo: bloque.alguien_ira_conmigo,
      recordatorio: bloque.recordatorio,
    });

    if (!resultado.googleEventId) continue;
    const { error: errorGuardado } = await admin
      .from("agenda_personal")
      .update({ google_event_id: resultado.googleEventId })
      .eq("id", bloque.id)
      .is("google_event_id", null);

    if (errorGuardado) {
      console.error("[agenda-personal] No se pudo guardar el ID durante la sincronización inicial:", errorGuardado.message);
      await eliminarEventoGoogle(perfilId, resultado.googleEventId);
      continue;
    }

    sincronizados += 1;
  }

  return sincronizados;
}
