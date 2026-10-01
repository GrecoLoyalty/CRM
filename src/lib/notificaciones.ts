import { createServiceClient } from "@/lib/supabase/server";
import { enviarEmail } from "@/lib/email";

interface NotificacionCRMInput {
  perfilIds: string[];
  remitenteId?: string | null;
  tipo: string;
  titulo: string;
  mensaje?: string | null;
  detalle?: string | null;
  clienteId?: string | null;
}

function escaparHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function notificarPerfilesCRM(input: NotificacionCRMInput) {
  try {
    const perfilIds = [...new Set(input.perfilIds)].filter((id) => id && id !== input.remitenteId);
    if (perfilIds.length === 0) return;

    const admin = createServiceClient();
    const { error } = await admin.from("notificaciones").insert(
      perfilIds.map((destinatarioId) => ({
        destinatario_id: destinatarioId,
        tipo: input.tipo,
        titulo: input.titulo,
        mensaje: input.mensaje || null,
        cliente_id: input.clienteId || null,
      }))
    );
    if (error) console.error("[notificaciones] No se pudieron guardar avisos in-app:", error.message);

    const mensajeHtml = input.mensaje ? `<p>${escaparHtml(input.mensaje)}</p>` : "";
    const detalleHtml = input.detalle
      ? `<div style="white-space:pre-wrap;background:#f4f4f5;padding:12px;border-radius:6px">${escaparHtml(input.detalle)}</div>`
      : "";
    const html = `
      <div style="font-family:Arial,sans-serif;color:#18181b;line-height:1.5;max-width:600px">
        <p style="font-size:12px;color:#71717a;text-transform:uppercase">GRESANOVA OS · Notificación</p>
        <h2 style="font-size:20px;margin:12px 0">${escaparHtml(input.titulo)}</h2>
        ${mensajeHtml}
        ${detalleHtml}
        <p style="font-size:12px;color:#71717a;margin-top:24px">Entra al CRM para ver el contexto y responder.</p>
      </div>
    `;
    const asunto = input.titulo.replace(/[\r\n]+/g, " ").trim().slice(0, 250);

    for (const perfilId of perfilIds) {
      const { data, error: errorUsuario } = await admin.auth.admin.getUserById(perfilId);
      if (errorUsuario) {
        console.error("[notificaciones] No se pudo obtener el correo del perfil:", perfilId, errorUsuario.message);
        continue;
      }
      if (!data.user.email) continue;

      await enviarEmail({ to: [data.user.email], subject: asunto, html });
    }
  } catch (err) {
    console.error("[notificaciones] Falló el envío, se ignora para no interrumpir el flujo:", err);
  }
}