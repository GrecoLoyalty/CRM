"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { enviarEmail } from "@/lib/email";
import { validarContenidoPizarron, type ConexionPizarron, type Pizarron } from "@/lib/pizarron";

const RUTA = "/dashboard/pizarron";

export async function crearPizarron() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { id: null, error: "Inicia sesión para crear un pizarrón." };

  const { data, error } = await supabase
    .from("pizarrones")
    .insert({ titulo: "Nuevo pizarrón", creado_por: user.id })
    .select("id")
    .single();

  if (error) {
    console.error("[pizarron] No se pudo crear el pizarrón:", error.message);
    return { id: null, error: "No se pudo crear el pizarrón. Verifica que la migración 0033 esté aplicada." };
  }
  revalidatePath(RUTA);
  return { id: data.id, error: null };
}

export async function guardarPizarron(
  id: string,
  titulo: string,
  elementos: unknown,
  conexiones: unknown
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Inicia sesión para guardar el pizarrón." };

  const tituloLimpio = titulo.trim();
  if (!id || tituloLimpio.length < 1 || tituloLimpio.length > 100) {
    return { error: "El título debe tener entre 1 y 100 caracteres." };
  }
  if (!validarContenidoPizarron(elementos, conexiones)) {
    return { error: "El contenido del pizarrón no es válido." };
  }

  const { data, error } = await supabase
    .from("pizarrones")
    .update({ titulo: tituloLimpio, elementos, conexiones })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[pizarron] No se pudo guardar el pizarrón:", error.message);
    return { error: "No se pudo guardar el pizarrón. Inténtalo de nuevo." };
  }
  if (!data) return { error: "No tienes permiso para guardar este pizarrón." };
  revalidatePath(RUTA);
  return { error: null };
}

export async function eliminarPizarron(id: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Inicia sesión para eliminar el pizarrón." };

  const { data, error } = await supabase
    .from("pizarrones")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("[pizarron] No se pudo eliminar el pizarrón:", error.message);
    return { error: "No se pudo eliminar el pizarrón. Inténtalo de nuevo." };
  }
  if (!data) return { error: "No tienes permiso para eliminar este pizarrón." };

  revalidatePath(RUTA);
  return { error: null };
}

export async function crearEnlaceInvitacion(id: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { token: null, error: "Inicia sesión para compartir el pizarrón." };

  const { data: invitacionExistente, error: errorLectura } = await supabase
    .from("pizarron_invitaciones")
    .select("token")
    .eq("pizarron_id", id)
    .eq("activo", true)
    .maybeSingle();
  if (errorLectura) {
    console.error("[pizarron] No se pudo consultar la invitación:", errorLectura.message);
    return { token: null, error: "No se pudo generar el enlace de invitación." };
  }
  if (invitacionExistente) return { token: invitacionExistente.token, error: null };

  const { data, error } = await supabase
    .from("pizarron_invitaciones")
    .insert({ pizarron_id: id, creado_por: user.id })
    .select("token")
    .single();
  if (error) {
    console.error("[pizarron] No se pudo crear la invitación:", error.message);
    return { token: null, error: "No se pudo generar el enlace. Verifica que la migración 0034 esté aplicada." };
  }

  return { token: data.token, error: null };
}

export async function revocarEnlaceInvitacion(id: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Inicia sesión para revocar el enlace." };

  const { error } = await supabase.rpc("fn_revocar_pizarron_invitacion", {
    p_pizarron_id: id,
  });
  if (error) {
    console.error("[pizarron] No se pudo revocar la invitación:", error.message);
    return { error: "No se pudo revocar el enlace de invitación." };
  }
  revalidatePath(RUTA);
  return { error: null };
}

export async function aceptarInvitacionPizarron(token: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Inicia sesión para aceptar la invitación." };
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
    return { error: "El enlace de invitación no es válido." };
  }

  const { error } = await supabase.rpc("fn_aceptar_pizarron_invitacion", {
    p_token: token,
  });
  if (error) {
    console.error("[pizarron] No se pudo aceptar la invitación:", error.message);
    return { error: error.message.includes("revocada")
      ? "La invitación no existe o ya fue revocada."
      : "No se pudo agregar el pizarrón. Inténtalo de nuevo." };
  }

  revalidatePath(RUTA);
  return { error: null };
}

export async function quitarPizarronCompartido(id: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Inicia sesión para quitar el pizarrón." };

  const { error } = await supabase
    .from("pizarrones_compartidos")
    .delete()
    .eq("pizarron_id", id)
    .eq("perfil_id", user.id);
  if (error) {
    console.error("[pizarron] No se pudo quitar el pizarrón compartido:", error.message);
    return { error: "No se pudo quitar el pizarrón de tu lista." };
  }
  revalidatePath(RUTA);
  return { error: null };
}

export async function clonarPizarron(id: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { pizarron: null, error: "Inicia sesión para clonar el pizarrón." };

  const { data: compartido, error: errorCompartido } = await supabase
    .from("pizarrones_compartidos")
    .select("pizarron_id")
    .eq("pizarron_id", id)
    .eq("perfil_id", user.id)
    .maybeSingle();
  if (errorCompartido || !compartido) {
    return { pizarron: null, error: "Solo puedes clonar un pizarrón que hayas agregado desde una invitación." };
  }

  const { data: original, error: errorOriginal } = await supabase
    .from("pizarrones")
    .select("titulo, elementos, conexiones")
    .eq("id", id)
    .single();
  if (errorOriginal || !original) {
    if (errorOriginal) console.error("[pizarron] No se pudo cargar para clonar:", errorOriginal.message);
    return { pizarron: null, error: "No se encontró el pizarrón compartido." };
  }
  if (!validarContenidoPizarron(original.elementos, original.conexiones)) {
    return { pizarron: null, error: "El pizarrón compartido tiene contenido no válido." };
  }

  const { data, error } = await supabase
    .from("pizarrones")
    .insert({
      titulo: `${original.titulo} (copia)`.slice(0, 100),
      elementos: original.elementos,
      conexiones: original.conexiones,
      creado_por: user.id,
    })
    .select("*")
    .single();
  if (error) {
    console.error("[pizarron] No se pudo clonar el pizarrón:", error.message);
    return { pizarron: null, error: "No se pudo crear la copia del pizarrón." };
  }

  revalidatePath(RUTA);
  return { pizarron: data as Pizarron, error: null };
}

function escaparHTML(texto: string) {
  return texto.replace(/[&<>"']/g, (caracter) => {
    const entidades: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entidades[caracter];
  });
}

export async function enviarPizarronPorCorreo(id: string, destinatario: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Inicia sesión para enviar el pizarrón." };

  const email = destinatario.trim();
  if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Escribe una dirección de correo válida." };
  }

  const { data: pizarron, error } = await supabase
    .from("pizarrones")
    .select("titulo, elementos, conexiones")
    .eq("id", id)
    .single();
  if (error || !pizarron) {
    if (error) console.error("[pizarron] No se pudo cargar el pizarrón para enviar:", error.message);
    return { error: "No se encontró el pizarrón o no se pudo cargar." };
  }
  if (!validarContenidoPizarron(pizarron.elementos, pizarron.conexiones)) {
    return { error: "El pizarrón guardado tiene contenido no válido." };
  }

  const elementos = pizarron.elementos.map(
    (elemento) =>
      `<li style="margin:0 0 12px;padding:12px;border-left:4px solid ${elemento.color};background:#f5f7fa"><strong>${elemento.tipo === "idea" ? "Idea" : "Texto"}</strong><br>${escaparHTML(elemento.texto).replace(/\n/g, "<br>")}</li>`
  );
  const textoPorId = new Map(pizarron.elementos.map((elemento) => [elemento.id, elemento.texto]));
  const conexiones = pizarron.conexiones.map(
    (conexion: ConexionPizarron) =>
      `<li>${escaparHTML(textoPorId.get(conexion.desde) || "Elemento")} → ${escaparHTML(textoPorId.get(conexion.hacia) || "Elemento")}</li>`
  );
  const envio = await enviarEmail({
    to: [email],
    subject: `Pizarrón: ${pizarron.titulo}`,
    html: `<div style="font-family:Arial,sans-serif;color:#1a2130;max-width:680px;margin:auto"><h1>${escaparHTML(pizarron.titulo)}</h1><p>Este es el contenido del pizarrón compartido desde GRESANOVA OS.</p><ol style="padding-left:20px">${elementos.join("") || "<li>El pizarrón todavía no tiene ideas.</li>"}</ol><h2>Conexiones</h2><ul style="padding-left:20px">${conexiones.join("") || "<li>No hay conexiones entre elementos.</li>"}</ul></div>`,
  });

  if (!envio.enviado) return { error: envio.motivo || "No se pudo enviar el correo." };
  return { error: null };
}
