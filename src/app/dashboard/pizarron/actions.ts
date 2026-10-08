"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { enviarEmail } from "@/lib/email";
import { validarContenidoPizarron, type ConexionPizarron } from "@/lib/pizarron";

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
