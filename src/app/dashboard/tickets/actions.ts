"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { enviarEmail } from "@/lib/email";
import type { Depto, PrioridadTicket } from "@/lib/types";

interface TicketInput {
  titulo: string;
  descripcion?: string;
  prioridad: PrioridadTicket;
  destinoTipo: "depto" | "personas";
  depto?: Depto | null;
  destinatarios?: string[];
  clienteId?: string | null;
}

// Notifica (campanita + correo) a quienes debieran enterarse de un ticket
// nuevo. Usa el cliente de servicio: notificaciones no tiene política de
// INSERT para usuarios normales, y necesitamos el correo real de
// auth.users para el aviso por email.
async function notificarTicket(params: {
  perfilIds: string[];
  organizadorNombre: string;
  titulo: string;
  descripcion?: string | null;
  prioridad: string;
  esComentario?: boolean;
}) {
  const idsUnicos = [...new Set(params.perfilIds)];
  if (idsUnicos.length === 0) return;
  const admin = createServiceClient();

  const tituloNotif = params.esComentario ? `Nuevo comentario en: ${params.titulo}` : `Nuevo ticket: ${params.titulo}`;
  const mensajeNotif = params.esComentario
    ? `${params.organizadorNombre} comentó`
    : `${params.organizadorNombre} · Prioridad ${params.prioridad}`;

  await admin.from("notificaciones").insert(
    idsUnicos.map((perfilId) => ({
      destinatario_id: perfilId,
      tipo: "ticket",
      titulo: tituloNotif,
      mensaje: mensajeNotif,
    }))
  );

  const destinatarios: string[] = [];
  for (const perfilId of idsUnicos) {
    const { data } = await admin.auth.admin.getUserById(perfilId);
    if (data?.user?.email) destinatarios.push(data.user.email);
  }

  if (destinatarios.length > 0) {
    await enviarEmail({
      to: destinatarios,
      subject: tituloNotif,
      html: `
        <div style="font-family:sans-serif;color:#111">
          <h2 style="margin-bottom:4px">${params.titulo}</h2>
          <p style="color:#555;margin-top:0">${mensajeNotif}</p>
          ${params.descripcion ? `<p>${params.descripcion}</p>` : ""}
          <p style="color:#888;font-size:13px">GRESANOVA OS</p>
        </div>
      `,
    });
  }
}

// Personas activas que pertenecen a un depto (principal o adicional) —
// para avisarles cuando un ticket se dirige a "todo el departamento".
async function idsDelDepto(depto: Depto): Promise<string[]> {
  const admin = createServiceClient();
  const { data } = await admin.from("perfiles_departamentos").select("perfil_id").eq("depto", depto);
  return (data || []).map((r) => r.perfil_id);
}

export async function crearTicket(input: TicketInput) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  if (!input.titulo.trim()) throw new Error("El ticket necesita un título.");
  if (input.destinoTipo === "depto" && !input.depto) throw new Error("Elige a qué departamento va dirigido.");
  if (input.destinoTipo === "personas" && (!input.destinatarios || input.destinatarios.length === 0)) {
    throw new Error("Elige a quién va dirigido el ticket.");
  }

  const { data: miPerfil } = await supabase.from("perfiles").select("nombre_completo").eq("id", user.id).single();

  const { data: ticket, error } = await supabase
    .from("tickets")
    .insert({
      titulo: input.titulo.trim(),
      descripcion: input.descripcion?.trim() || null,
      prioridad: input.prioridad,
      cliente_id: input.clienteId || null,
      depto_destino: input.destinoTipo === "depto" ? input.depto : null,
      creado_por: user.id,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  let aNotificar: string[] = [];
  if (input.destinoTipo === "personas" && input.destinatarios) {
    const { error: errDest } = await supabase
      .from("ticket_destinatarios")
      .insert(input.destinatarios.map((perfilId) => ({ ticket_id: ticket.id, perfil_id: perfilId })));
    if (errDest) throw new Error(errDest.message);
    aNotificar = input.destinatarios;
  } else if (input.destinoTipo === "depto" && input.depto) {
    aNotificar = (await idsDelDepto(input.depto)).filter((id) => id !== user.id);
  }

  await notificarTicket({
    perfilIds: aNotificar,
    organizadorNombre: miPerfil?.nombre_completo || "Alguien del equipo",
    titulo: ticket.titulo,
    descripcion: ticket.descripcion,
    prioridad: ticket.prioridad,
  });

  revalidatePath("/dashboard/tickets");
  return ticket;
}

// Cualquiera que pueda ver el ticket (persona del depto destino, o
// destinatario puntual) puede tomarlo — queda asignado a él/ella.
export async function tomarTicket(ticketId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase
    .from("tickets")
    .update({ asignado_a: user.id, estado: "en_progreso" })
    .eq("id", ticketId);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/tickets");
  revalidatePath(`/dashboard/tickets/${ticketId}`);
}

export async function cambiarEstadoTicket(ticketId: string, nuevoEstado: "abierto" | "en_progreso" | "resuelto" | "cerrado") {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const patch: Record<string, any> = { estado: nuevoEstado };
  if (nuevoEstado === "resuelto") {
    patch.resuelto_por = user.id;
    patch.resuelto_en = new Date().toISOString();
  }

  const { error } = await supabase.from("tickets").update(patch).eq("id", ticketId);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/tickets");
  revalidatePath(`/dashboard/tickets/${ticketId}`);
}

export async function reasignarTicket(ticketId: string, nuevoAsignadoId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("tickets").update({ asignado_a: nuevoAsignadoId }).eq("id", ticketId);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/tickets");
  revalidatePath(`/dashboard/tickets/${ticketId}`);
}

export async function comentarTicket(ticketId: string, mensaje: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  if (!mensaje.trim()) throw new Error("Escribe algo antes de enviar.");

  const { data: miPerfil } = await supabase.from("perfiles").select("nombre_completo").eq("id", user.id).single();
  const { data: ticket } = await supabase.from("tickets").select("titulo, creado_por, asignado_a").eq("id", ticketId).single();

  const { error } = await supabase.from("ticket_comentarios").insert({
    ticket_id: ticketId,
    autor_id: user.id,
    mensaje: mensaje.trim(),
  });
  if (error) throw new Error(error.message);

  const aAvisar = [ticket?.creado_por, ticket?.asignado_a].filter((id): id is string => !!id && id !== user.id);
  if (ticket) {
    await notificarTicket({
      perfilIds: aAvisar,
      organizadorNombre: miPerfil?.nombre_completo || "Alguien del equipo",
      titulo: ticket.titulo,
      descripcion: mensaje.trim(),
      prioridad: "",
      esComentario: true,
    });
  }

  revalidatePath(`/dashboard/tickets/${ticketId}`);
}
