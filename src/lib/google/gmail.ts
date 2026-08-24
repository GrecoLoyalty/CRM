// Envío de correos vía la API de Gmail, usando la cuenta de Google que el
// propio usuario conectó (OAuth). A diferencia de src/lib/email.ts (que
// manda todo desde un remitente genérico vía Resend), esto llega a la
// bandeja del destinatario "de parte de" esa persona real del equipo.
//
// No agrega dependencias nuevas: arma el mensaje MIME a mano y usa fetch,
// igual que ya hace lib/email.ts con Resend.

import { obtenerAccessTokenValido } from "./tokens";

function construirMensajeMimeBase64(params: { to: string[]; subject: string; html: string }) {
  const asuntoCodificado = `=?UTF-8?B?${Buffer.from(params.subject, "utf-8").toString("base64")}?=`;
  const lineas = [
    `To: ${params.to.join(", ")}`,
    `Subject: ${asuntoCodificado}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "",
    params.html,
  ];
  const mensaje = lineas.join("\r\n");
  // Gmail espera base64url (sin +, /, = de relleno), no base64 normal.
  return Buffer.from(mensaje, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Manda un correo desde la cuenta de Gmail conectada de `perfilId`.
// Si ese usuario no ha conectado Google, regresa { enviado: false, ... }
// en vez de tronar — así el código que llama puede caer de vuelta a
// enviarEmail() (Resend) si quiere.
export async function enviarGmail(
  perfilId: string,
  params: { to: string[]; subject: string; html: string }
): Promise<{ enviado: boolean; motivo?: string }> {
  if (params.to.length === 0) return { enviado: false, motivo: "Sin destinatarios" };

  const accessToken = await obtenerAccessTokenValido(perfilId);
  if (!accessToken) {
    return { enviado: false, motivo: "Este usuario no tiene su cuenta de Google conectada" };
  }

  const raw = construirMensajeMimeBase64(params);

  try {
    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    });

    if (!res.ok) {
      const detalle = await res.text();
      console.error("[gmail] Falló el envío:", res.status, detalle);
      return { enviado: false, motivo: detalle };
    }
    return { enviado: true };
  } catch (err: any) {
    console.error("[gmail] Falló el envío:", err);
    return { enviado: false, motivo: err.message };
  }
}
