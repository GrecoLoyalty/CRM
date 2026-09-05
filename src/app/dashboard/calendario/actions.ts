"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { enviarEmail } from "@/lib/email";
import { crearEventoGoogle, actualizarEventoGoogle, eliminarEventoGoogle } from "@/lib/google/calendar";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Junta los correos reales (auth.users) de una lista de perfiles. Se usa
// tanto para las notificaciones internas por correo como para invitar a
// esas mismas personas dentro del evento espejo de Google Calendar.
async function obtenerEmailsDePerfiles(admin: ReturnType<typeof createServiceClient>, perfilIds: string[]) {
  const emails: string[] = [];
  for (const perfilId of perfilIds) {
    const { data } = await admin.auth.admin.getUserById(perfilId);
    if (data?.user?.email) emails.push(data.user.email);
  }
  return emails;
}

interface EventoInput {
  titulo: string;
  descripcion?: string;
  fechaInicio: string; // ISO
  fechaFin: string; // ISO
  todoElDia?: boolean;
  ubicacion?: string;
  clienteId?: string | null;
  invitados: string[]; // ids de perfiles (sin contar al creador)
}

interface AgendaPersonalInput {
  titulo: string;
  fechaInicio: string;
  fechaFin: string;
  estado: "ocupado" | "disponible";
}

export async function crearBloqueAgendaPersonal(input: AgendaPersonalInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  if (!input.titulo.trim()) throw new Error("El bloque necesita un título.");
  if (new Date(input.fechaFin) <= new Date(input.fechaInicio)) {
    throw new Error("La fecha de fin debe ser posterior a la de inicio.");
  }

  const { data, error } = await supabase.from("agenda_personal").insert({
    perfil_id: user.id,
    titulo: input.titulo.trim(),
    fecha_inicio: input.fechaInicio,
    fecha_fin: input.fechaFin,
    estado: input.estado,
  }).select().single();
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/calendario");
  return data;
}

export async function eliminarBloqueAgendaPersonal(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("agenda_personal").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/calendario");
}

// Notifica (campanita interna + correo) a cada invitado. Usa el cliente de
// servicio porque la tabla `notificaciones` no tiene política de INSERT
// para usuarios normales (solo se escribe desde funciones/lógica de
// confianza) y porque necesitamos el correo real de auth.users, que no es
// visible por RLS normal.
async function notificarInvitados(params: {
  invitadoIds: string[];
  organizadorNombre: string;
  titulo: string;
  descripcion?: string | null;
  fechaInicio: string;
  ubicacion?: string | null;
  eventoId: string;
}) {
  if (params.invitadoIds.length === 0) return;
  const admin = createServiceClient();

  const fechaBonita = format(new Date(params.fechaInicio), "EEEE d 'de' MMMM, h:mm a", { locale: es });

  await admin.from("notificaciones").insert(
    params.invitadoIds.map((perfilId) => ({
      destinatario_id: perfilId,
      tipo: "evento_calendario",
      titulo: `Te invitaron a: ${params.titulo}`,
      mensaje: `${params.organizadorNombre} te invitó · ${fechaBonita}${params.ubicacion ? ` · ${params.ubicacion}` : ""}`,
    }))
  );

  // Correo: se obtiene el email real desde auth.users vía Admin API
  // (perfiles no guarda el correo, solo auth.users lo tiene).
  const destinatarios: string[] = [];
  for (const perfilId of params.invitadoIds) {
    const { data } = await admin.auth.admin.getUserById(perfilId);
    if (data?.user?.email) destinatarios.push(data.user.email);
  }

  if (destinatarios.length > 0) {
    await enviarEmail({
      to: destinatarios,
      subject: `Invitación: ${params.titulo}`,
      html: `
        <div style="font-family:sans-serif;color:#111">
          <h2 style="margin-bottom:4px">${params.titulo}</h2>
          <p style="color:#555;margin-top:0">${fechaBonita}${params.ubicacion ? ` · ${params.ubicacion}` : ""}</p>
          ${params.descripcion ? `<p>${params.descripcion}</p>` : ""}
          <p style="color:#888;font-size:13px">Invitado por ${params.organizadorNombre} · GRESANOVA OS</p>
        </div>
      `,
    });
  }
}

export async function crearEvento(input: EventoInput) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  if (!input.titulo.trim()) throw new Error("El evento necesita un título.");
  if (new Date(input.fechaFin) < new Date(input.fechaInicio)) throw new Error("La fecha de fin no puede ser antes que la de inicio.");

  const { data: miPerfil } = await supabase.from("perfiles").select("nombre_completo").eq("id", user.id).single();

  const { data: evento, error } = await supabase
    .from("eventos_calendario")
    .insert({
      titulo: input.titulo.trim(),
      descripcion: input.descripcion?.trim() || null,
      fecha_inicio: input.fechaInicio,
      fecha_fin: input.fechaFin,
      todo_el_dia: !!input.todoElDia,
      ubicacion: input.ubicacion?.trim() || null,
      cliente_id: input.clienteId || null,
      creado_por: user.id,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  // El organizador queda invitado (y confirmado) automáticamente.
  const idsUnicos = [...new Set([user.id, ...input.invitados])];
  const { error: errInvitados } = await supabase.from("evento_invitados").insert(
    idsUnicos.map((perfilId) => ({
      evento_id: evento.id,
      perfil_id: perfilId,
      respuesta: perfilId === user.id ? "acepta" : "pendiente",
    }))
  );
  if (errInvitados) throw new Error(errInvitados.message);

  const invitadosAAvisar = idsUnicos.filter((id) => id !== user.id);
  await notificarInvitados({
    invitadoIds: invitadosAAvisar,
    organizadorNombre: miPerfil?.nombre_completo || "Alguien del equipo",
    titulo: evento.titulo,
    descripcion: evento.descripcion,
    fechaInicio: evento.fecha_inicio,
    ubicacion: evento.ubicacion,
    eventoId: evento.id,
  });

  // Si el organizador conectó su cuenta de Google, el evento también se crea
  // en su Google Calendar personal, con el resto de invitados como
  // asistentes. Si no la conectó, esto simplemente no hace nada (best effort).
  const admin = createServiceClient();
  const emailsInvitados = await obtenerEmailsDePerfiles(admin, invitadosAAvisar);
  const googleEventId = await crearEventoGoogle(user.id, {
    titulo: evento.titulo,
    descripcion: evento.descripcion,
    fechaInicio: evento.fecha_inicio,
    fechaFin: evento.fecha_fin,
    todoElDia: evento.todo_el_dia,
    ubicacion: evento.ubicacion,
    invitadosEmails: emailsInvitados,
  });
  if (googleEventId) {
    await supabase
      .from("eventos_calendario")
      .update({ google_event_id: googleEventId, google_calendar_perfil_id: user.id })
      .eq("id", evento.id);
  }

  revalidatePath("/dashboard/calendario");
  return evento;
}

export async function actualizarEvento(eventoId: string, input: EventoInput) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  if (!input.titulo.trim()) throw new Error("El evento necesita un título.");

  const { data: miPerfil } = await supabase.from("perfiles").select("nombre_completo").eq("id", user.id).single();

  const { data: evento, error } = await supabase
    .from("eventos_calendario")
    .update({
      titulo: input.titulo.trim(),
      descripcion: input.descripcion?.trim() || null,
      fecha_inicio: input.fechaInicio,
      fecha_fin: input.fechaFin,
      todo_el_dia: !!input.todoElDia,
      ubicacion: input.ubicacion?.trim() || null,
      cliente_id: input.clienteId || null,
    })
    .eq("id", eventoId)
    .select()
    .single();
  if (error) throw new Error(error.message);

  // Recalcula la lista de invitados: solo se avisa (correo + notificación) a los NUEVOS.
  const { data: actuales } = await supabase.from("evento_invitados").select("perfil_id").eq("evento_id", eventoId);
  const actualesIds = new Set((actuales || []).map((r) => r.perfil_id));
  const idsUnicos = [...new Set([evento.creado_por, ...input.invitados])];

  const nuevos = idsUnicos.filter((id) => !actualesIds.has(id));
  const aQuitar = [...actualesIds].filter((id) => !idsUnicos.includes(id) && id !== evento.creado_por);

  if (nuevos.length > 0) {
    const { error: errIns } = await supabase
      .from("evento_invitados")
      .upsert(nuevos.map((perfilId) => ({ evento_id: eventoId, perfil_id: perfilId, respuesta: "pendiente" })), {
        onConflict: "evento_id,perfil_id",
      });
    if (errIns) throw new Error(errIns.message);
  }
  if (aQuitar.length > 0) {
    await supabase.from("evento_invitados").delete().eq("evento_id", eventoId).in("perfil_id", aQuitar);
  }

  if (nuevos.length > 0) {
    await notificarInvitados({
      invitadoIds: nuevos,
      organizadorNombre: miPerfil?.nombre_completo || "Alguien del equipo",
      titulo: evento.titulo,
      descripcion: evento.descripcion,
      fechaInicio: evento.fecha_inicio,
      ubicacion: evento.ubicacion,
      eventoId: evento.id,
    });
  }

  // Refleja los cambios en el evento espejo de Google Calendar, si existe.
  const admin = createServiceClient();
  if (evento.google_event_id && evento.google_calendar_perfil_id) {
    const idsInvitadosFinal = idsUnicos.filter((id) => id !== evento.creado_por);
    const emailsInvitados = await obtenerEmailsDePerfiles(admin, idsInvitadosFinal);
    await actualizarEventoGoogle(evento.google_calendar_perfil_id, evento.google_event_id, {
      titulo: evento.titulo,
      descripcion: evento.descripcion,
      fechaInicio: evento.fecha_inicio,
      fechaFin: evento.fecha_fin,
      todoElDia: evento.todo_el_dia,
      ubicacion: evento.ubicacion,
      invitadosEmails: emailsInvitados,
    });
  }

  revalidatePath("/dashboard/calendario");
  return evento;
}

export async function eliminarEvento(eventoId: string) {
  const supabase = createClient();

  // Se necesita saber si había un evento espejo en Google ANTES de borrar
  // la fila (para poder borrarlo también allá).
  const { data: evento } = await supabase
    .from("eventos_calendario")
    .select("google_event_id, google_calendar_perfil_id")
    .eq("id", eventoId)
    .single();

  const { error } = await supabase.from("eventos_calendario").delete().eq("id", eventoId);
  if (error) throw new Error(error.message);

  if (evento?.google_event_id && evento?.google_calendar_perfil_id) {
    await eliminarEventoGoogle(evento.google_calendar_perfil_id, evento.google_event_id);
  }

  revalidatePath("/dashboard/calendario");
}

export async function responderInvitacion(eventoId: string, respuesta: "acepta" | "rechaza") {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase
    .from("evento_invitados")
    .update({ respuesta })
    .eq("evento_id", eventoId)
    .eq("perfil_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/calendario");
}
