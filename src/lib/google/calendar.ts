// Sincroniza eventos de `eventos_calendario` (la agenda de equipo interna)
// con el Google Calendar personal del organizador, si conectó su cuenta.
// Todo es "best effort": si el organizador no conectó Google, o la llamada
// falla, estas funciones regresan null/false en vez de tronar — el
// calendario interno del CRM sigue siendo la fuente de verdad.

import { obtenerAccessTokenValido } from "./tokens";

interface EventoGoogleInput {
  titulo: string;
  descripcion?: string | null;
  fechaInicio: string; // ISO
  fechaFin: string; // ISO
  todoElDia?: boolean;
  ubicacion?: string | null;
  invitadosEmails?: string[];
}

function cuerpoEvento(input: EventoGoogleInput) {
  const body: Record<string, unknown> = {
    summary: input.titulo,
    description: input.descripcion || undefined,
    location: input.ubicacion || undefined,
  };

  if (input.todoElDia) {
    body.start = { date: input.fechaInicio.slice(0, 10) };
    body.end = { date: input.fechaFin.slice(0, 10) };
  } else {
    body.start = { dateTime: input.fechaInicio };
    body.end = { dateTime: input.fechaFin };
  }

  if (input.invitadosEmails && input.invitadosEmails.length > 0) {
    body.attendees = input.invitadosEmails.map((email) => ({ email }));
  }

  return body;
}

// Crea el evento en el Google Calendar ("primary") del organizador.
// Devuelve el id del evento de Google (para poder editarlo/borrarlo luego)
// o null si el organizador no tiene Google conectado / la llamada falló.
export async function crearEventoGoogle(perfilId: string, input: EventoGoogleInput): Promise<string | null> {
  const accessToken = await obtenerAccessTokenValido(perfilId);
  if (!accessToken) return null;

  try {
    const res = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(cuerpoEvento(input)),
      }
    );
    if (!res.ok) {
      console.error("[google-calendar] Falló crear evento:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return data.id as string;
  } catch (err) {
    console.error("[google-calendar] Falló crear evento:", err);
    return null;
  }
}

export async function actualizarEventoGoogle(
  perfilId: string,
  googleEventId: string,
  input: EventoGoogleInput
): Promise<boolean> {
  const accessToken = await obtenerAccessTokenValido(perfilId);
  if (!accessToken) return false;

  try {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}?sendUpdates=all`,
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(cuerpoEvento(input)),
      }
    );
    return res.ok;
  } catch (err) {
    console.error("[google-calendar] Falló actualizar evento:", err);
    return false;
  }
}

export async function eliminarEventoGoogle(perfilId: string, googleEventId: string): Promise<boolean> {
  const accessToken = await obtenerAccessTokenValido(perfilId);
  if (!accessToken) return false;

  try {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}?sendUpdates=all`,
      { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }
    );
    // 410 = Google ya lo tenía borrado (p.ej. el usuario lo borró a mano) — no es un error para nosotros.
    return res.ok || res.status === 410;
  } catch (err) {
    console.error("[google-calendar] Falló borrar evento:", err);
    return false;
  }
}
