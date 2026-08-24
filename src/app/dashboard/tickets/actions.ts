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
//
// IMPORTANTE: esto es un efecto secundario (avisar), NUNCA debe poder
// tumbar la creación/actualización del ticket en sí. Por eso todo el
// cuerpo va envuelto en try/catch: si falla (p. ej. falta la variable de
// entorno SUPABASE_SERVICE_ROLE_KEY, o Resend no está configurado), solo
// se registra en el log del servidor y seguimos de largo.
async function notificarTicket(params: {
  perfilIds: string[];
  organizadorNombre: string;
  titulo: string;
  descripcion?: string | null;
  prioridad: string;
  esComentario?: boolean;
}) {
  try {
    const idsUnicos = [...new Set(params.perfilIds)];
    if (idsUnicos.length === 0) return;
    const admin = createServiceClient();

    const tituloNotif = params.esComentario ? `Nuevo comentario en: ${params.titulo}` : `Nuevo ticket: ${params.titulo}`;
    const mensajeNotif = params.esComentario
      ? `${params.organizadorNombre} comentó`
      : `${params.organizadorNombre} · Prioridad ${params.prioridad}`;

    const { error: errNotif } = await admin.from("notificaciones").insert(
      idsUnicos.map((perfilId) => ({
        destinatario_id: perfilId,
        tipo: "ticket",
        titulo: tituloNotif,
        mensaje: mensajeNotif,
      }))
    );
    if (errNotif) console.error("[tickets] No se pudo insertar la notificación:", errNotif.message);

    const destinatarios: string[] = [];
    for (const perfilId of idsUnicos) {
      const { data, error: errUser } = await admin.auth.admin.getUserById(perfilId);
      if (errUser) console.error("[tickets] No se pudo obtener el correo de", perfilId, errUser.message);
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
  } catch (err: any) {
    // Nunca dejamos que un fallo de notificaciones tumbe la acción principal
    // (crear/comentar el ticket). Solo lo dejamos registrado en el log.
    console.error("[tickets] notificarTicket falló, se ignora para no romper la acción principal:", err?.message || err);
  }
}

// Personas activas que pertenecen a un depto (principal o adicional) —
// para avisarles cuando un ticket se dirige a "todo el departamento".
async function idsDelDepto(depto: Depto): Promise<string[]> {
  try {
    const admin = createServiceClient();
    const { data, error } = await admin.from("perfiles_departamentos").select("perfil_id").eq("depto", depto);
    if (error) {
      console.error("[tickets] No se pudo obtener la lista del depto:", error.message);
      return [];
    }
    return (data || []).map((r) => r.perfil_id);
  } catch (err: any) {
    console.error("[tickets] idsDelDepto falló, se ignora para no romper la acción principal:", err?.message || err);
    return [];
  }
}

export async function crearTicket(input: TicketInput): Promise<{ ticket: any | null; error: string | null }> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ticket: null, error: "No autenticado" };

    if (!input.titulo.trim()) return { ticket: null, error: "El ticket necesita un título." };
    if (input.destinoTipo === "depto" && !input.depto) return { ticket: null, error: "Elige a qué departamento va dirigido." };
    if (input.destinoTipo === "personas" && (!input.destinatarios || input.destinatarios.length === 0)) {
      return { ticket: null, error: "Elige a quién va dirigido el ticket." };
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
    if (error) {
      // DIAGNÓSTICO TEMPORAL: la política y el perfil ya se confirmaron
      // correctos, así que ahora comparamos contra lo que Postgres ve
      // REALMENTE como auth.uid() en esta misma petición autenticada
      // (fn_debug_auth_uid, ver migración 0024). Si auth_uid sale null
      // o distinto de user.id, confirma que la sesión no se está
      // propagando bien a esta llamada. Quitar todo este bloque en
      // cuanto encontremos la causa real.
      const { data: debugAuth, error: errDebug } = await supabase.rpc("fn_debug_auth_uid");
      return {
        ticket: null,
        error: `${error.message} — diagnóstico: user.id="${user.id}", email="${user.email}", fn_debug_auth_uid=${JSON.stringify(debugAuth)}${errDebug ? `, errDebug=${errDebug.message}` : ""}`,
      };
    }

    let aNotificar: string[] = [];
    if (input.destinoTipo === "personas" && input.destinatarios) {
      const { error: errDest } = await supabase
        .from("ticket_destinatarios")
        .insert(input.destinatarios.map((perfilId) => ({ ticket_id: ticket.id, perfil_id: perfilId })));
      if (errDest) return { ticket: null, error: errDest.message };
      aNotificar = input.destinatarios;
    } else if (input.destinoTipo === "depto" && input.depto) {
      aNotificar = (await idsDelDepto(input.depto)).filter((id) => id !== user.id);
    }

    // notificarTicket ya nunca truena (se blindó internamente), pero por
    // si acaso también lo envolvemos aquí: un aviso fallido jamás debe
    // hacer que el usuario piense que el ticket no se creó.
    await notificarTicket({
      perfilIds: aNotificar,
      organizadorNombre: miPerfil?.nombre_completo || "Alguien del equipo",
      titulo: ticket.titulo,
      descripcion: ticket.descripcion,
      prioridad: ticket.prioridad,
    });

    revalidatePath("/dashboard/tickets");
    return { ticket, error: null };
  } catch (err: any) {
    console.error("[tickets] crearTicket falló:", err?.message || err);
    return { ticket: null, error: err?.message || "No se pudo crear el ticket. Intenta de nuevo." };
  }
}

// Cualquiera que pueda ver el ticket (persona del depto destino, o
// destinatario puntual) puede tomarlo — queda asignado a él/ella.
export async function tomarTicket(ticketId: string): Promise<{ error: string | null }> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado" };

    const { error } = await supabase
      .from("tickets")
      .update({ asignado_a: user.id, estado: "en_progreso" })
      .eq("id", ticketId);
    if (error) return { error: error.message };

    revalidatePath("/dashboard/tickets");
    revalidatePath(`/dashboard/tickets/${ticketId}`);
    return { error: null };
  } catch (err: any) {
    console.error("[tickets] tomarTicket falló:", err?.message || err);
    return { error: err?.message || "No se pudo tomar el ticket. Intenta de nuevo." };
  }
}

export async function cambiarEstadoTicket(
  ticketId: string,
  nuevoEstado: "abierto" | "en_progreso" | "resuelto" | "cerrado"
): Promise<{ error: string | null }> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado" };

    const patch: Record<string, any> = { estado: nuevoEstado };
    if (nuevoEstado === "resuelto") {
      patch.resuelto_por = user.id;
      patch.resuelto_en = new Date().toISOString();
    }

    const { error } = await supabase.from("tickets").update(patch).eq("id", ticketId);
    if (error) return { error: error.message };

    revalidatePath("/dashboard/tickets");
    revalidatePath(`/dashboard/tickets/${ticketId}`);
    return { error: null };
  } catch (err: any) {
    console.error("[tickets] cambiarEstadoTicket falló:", err?.message || err);
    return { error: err?.message || "No se pudo actualizar el ticket. Intenta de nuevo." };
  }
}

export async function reasignarTicket(ticketId: string, nuevoAsignadoId: string): Promise<{ error: string | null }> {
  try {
    const supabase = createClient();
    const { error } = await supabase.from("tickets").update({ asignado_a: nuevoAsignadoId }).eq("id", ticketId);
    if (error) return { error: error.message };

    revalidatePath("/dashboard/tickets");
    revalidatePath(`/dashboard/tickets/${ticketId}`);
    return { error: null };
  } catch (err: any) {
    console.error("[tickets] reasignarTicket falló:", err?.message || err);
    return { error: err?.message || "No se pudo reasignar el ticket. Intenta de nuevo." };
  }
}

export async function comentarTicket(ticketId: string, mensaje: string): Promise<{ error: string | null }> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado" };
    if (!mensaje.trim()) return { error: "Escribe algo antes de enviar." };

    const { data: miPerfil } = await supabase.from("perfiles").select("nombre_completo").eq("id", user.id).single();
    const { data: ticket } = await supabase.from("tickets").select("titulo, creado_por, asignado_a").eq("id", ticketId).single();

    const { error } = await supabase.from("ticket_comentarios").insert({
      ticket_id: ticketId,
      autor_id: user.id,
      mensaje: mensaje.trim(),
    });
    if (error) return { error: error.message };

    const aAvisar = [ticket?.creado_por, ticket?.asignado_a].filter((id): id is string => !!id && id !== user.id);
    if (ticket) {
      // Efecto secundario — ya blindado, nunca truena la acción principal.
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
    return { error: null };
  } catch (err: any) {
    console.error("[tickets] comentarTicket falló:", err?.message || err);
    return { error: err?.message || "No se pudo enviar el comentario. Intenta de nuevo." };
  }
}
