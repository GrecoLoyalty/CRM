// Envío de correos vía la API REST de Resend (https://resend.com).
// No agrega ninguna dependencia nueva al proyecto: solo usa fetch.
//
// CÓMO ACTIVARLO:
//   1. Crea una cuenta gratis en https://resend.com (tiene capa gratuita).
//   2. Verifica un dominio propio (o usa su dominio de pruebas
//      "onboarding@resend.dev" mientras haces pruebas — solo te deja
//      enviar a tu propio correo verificado en modo sandbox).
//   3. Genera una API key en el dashboard de Resend.
//   4. Agrega estas variables en tu .env.local (y en Vercel/hosting):
//        RESEND_API_KEY=re_xxxxxxxxxxxx
//        RESEND_FROM_EMAIL="GRESANOVA OS <notificaciones@tudominio.com>"
//
// Si no configuras RESEND_API_KEY, esta función simplemente no hace nada
// (con un aviso en consola) para que el resto del CRM siga funcionando
// sin necesidad de tener el correo configurado desde el día uno.
export async function enviarEmail({ to, subject, html }: { to: string[]; subject: string; html: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "GRESANOVA OS <onboarding@resend.dev>";

  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY no está configurada — no se envió el correo:", subject);
    return { enviado: false, motivo: "RESEND_API_KEY no configurada" };
  }
  if (to.length === 0) return { enviado: false, motivo: "Sin destinatarios" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });

    if (!res.ok) {
      const detalle = await res.text();
      console.error("[email] Resend respondió con error:", res.status, detalle);
      return { enviado: false, motivo: detalle };
    }
    return { enviado: true };
  } catch (err: any) {
    console.error("[email] Falló el envío:", err);
    return { enviado: false, motivo: err.message };
  }
}
