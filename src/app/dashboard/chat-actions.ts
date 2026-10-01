"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { notificarPerfilesCRM } from "@/lib/notificaciones";

function validarContenido(contenido: string) {
  const texto = contenido.trim();
  if (!texto) throw new Error("Escribe un mensaje antes de enviarlo.");
  if (texto.length > 5000) throw new Error("El mensaje no puede superar 5,000 caracteres.");
  return texto;
}

export async function enviarMensajeChatCliente(clienteId: string, contenido: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const texto = validarContenido(contenido);
  const [{ data: perfil }, { data: cliente }] = await Promise.all([
    supabase.from("perfiles").select("role, nombre_completo").eq("id", user.id).single(),
    supabase.from("clientes").select("id, nombre_empresa, vendedor_id, analista_id").eq("id", clienteId).single(),
  ]);
  if (!perfil || !cliente) throw new Error("No se encontró el cliente o tu perfil.");

  const { error } = await supabase.from("chat_mensajes").insert({
    cliente_id: clienteId,
    autor_id: user.id,
    es_ceo: perfil.role === "ceo" || perfil.role === "root",
    contenido: texto,
  });
  if (error) throw new Error(error.message);

  const admin = createServiceClient();
  const [{ data: tareas }, { data: lideres }] = await Promise.all([
    admin.from("tareas").select("asignado_a").eq("cliente_id", clienteId).not("asignado_a", "is", null),
    admin.from("perfiles").select("id").in("role", ["root", "ceo"]).eq("activo", true),
  ]);
  const destinatarios = [
    cliente.vendedor_id,
    cliente.analista_id,
    ...(tareas || []).map((tarea) => tarea.asignado_a),
    ...(lideres || []).map((lider) => lider.id),
  ].filter((id): id is string => !!id && id !== user.id);

  await notificarPerfilesCRM({
    perfilIds: destinatarios,
    remitenteId: user.id,
    tipo: "chat_cliente",
    titulo: `Nuevo mensaje: ${cliente.nombre_empresa}`,
    mensaje: `${perfil.nombre_completo} escribió en el chat del cliente.`,
    detalle: texto,
    clienteId,
  });
}

export async function enviarMensajeChatEquipo(conversacionId: string, contenido: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const texto = validarContenido(contenido);
  const { error } = await supabase.from("mensajes_generales").insert({
    conversacion_id: conversacionId,
    autor_id: user.id,
    contenido: texto,
  });
  if (error) throw new Error(error.message);

  const admin = createServiceClient();
  const [{ data: participantes }, { data: conversacion }, { data: perfil }] = await Promise.all([
    admin.from("conversacion_participantes").select("usuario_id").eq("conversacion_id", conversacionId),
    admin.from("conversaciones").select("tipo, nombre").eq("id", conversacionId).maybeSingle(),
    supabase.from("perfiles").select("nombre_completo").eq("id", user.id).single(),
  ]);

  await notificarPerfilesCRM({
    perfilIds: (participantes || []).map((participante) => participante.usuario_id),
    remitenteId: user.id,
    tipo: "chat_equipo",
    titulo: `Nuevo mensaje${conversacion?.nombre ? `: ${conversacion.nombre}` : " en el chat del equipo"}`,
    mensaje: `${perfil?.nombre_completo || "Un compañero"} escribió en la conversación.`,
    detalle: texto,
  });
}