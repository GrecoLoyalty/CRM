"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type EscenaInput = {
  visual: string;
  audio: string;
  texto_pantalla: string;
};

type GuionInput = {
  id?: string;
  marca_id: string;
  titulo: string;
  plataforma: string;
  formato: string;
  duracion_segundos: number | null;
  gancho: string;
  llamado_accion: string;
  notas_grabacion: string;
  estado: "borrador" | "en_revision" | "aprobado" | "grabado";
  escenas: EscenaInput[];
};

type PublicacionInput = {
  id?: string;
  marca_id: string;
  plataforma: string;
  fecha_hora: string;
  guion_id: string | null;
  caption: string;
  hashtags: string[];
  estado: "pendiente" | "publicado" | "cancelado";
  responsable_id: string | null;
  video_url: string | null;
  descarga_url: string | null;
  publicacion_url: string | null;
};

async function clienteConPermisoMarketing() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Inicia sesión para administrar Marketing.");
  const { data: perfil, error } = await supabase.from("perfiles").select("role").eq("id", user.id).single();
  if (error) throw new Error(error.message);
  if (!["root", "ceo", "analista", "marketing"].includes(perfil.role)) {
    throw new Error("No tienes permiso para administrar la estrategia de contenido.");
  }
  return { supabase, user };
}

function normalizarUrl(value: string | null | undefined, label: string) {
  const trimmed = value?.trim() || "";
  if (!trimmed) return null;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`El enlace de ${label} no es válido.`);
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`El enlace de ${label} debe usar http o https.`);
  }
  return parsed.toString();
}

function invalidarMarketing() {
  revalidatePath("/dashboard/marketing");
  revalidatePath("/dashboard/marketing/marcas");
  revalidatePath("/dashboard/marketing/guiones");
  revalidatePath("/dashboard/marketing/calendario");
  revalidatePath("/dashboard/marketing/para-publicar");
}

export async function guardarMarca(input: {
  id?: string;
  nombre: string;
  logo_url: string;
  color: string;
  plataformas_activas: string[];
}) {
  const { supabase } = await clienteConPermisoMarketing();
  const nombre = input.nombre.trim();
  if (!nombre) throw new Error("Escribe el nombre de la marca.");
  if (!/^#[0-9a-f]{6}$/i.test(input.color)) throw new Error("El color debe ser hexadecimal (por ejemplo, #3AA7A1).");
  const payload = {
    nombre,
    logo_url: normalizarUrl(input.logo_url, "logo"),
    color: input.color,
    plataformas_activas: [...new Set(input.plataformas_activas.map((p) => p.trim()).filter(Boolean))],
  };
  if (payload.plataformas_activas.length === 0) throw new Error("Activa al menos una plataforma para esta marca.");
  const { error } = input.id
    ? await supabase.from("marcas").update(payload).eq("id", input.id).select("id").single()
    : await supabase.from("marcas").insert(payload);
  if (error) throw new Error(error.message);
  invalidarMarketing();
}

export async function cambiarEstadoMarca(id: string, activa: boolean) {
  const { supabase } = await clienteConPermisoMarketing();
  const { error } = await supabase.from("marcas").update({ activa }).eq("id", id).select("id").single();
  if (error) throw new Error(error.message);
  invalidarMarketing();
}

export async function eliminarMarca(id: string) {
  const { supabase } = await clienteConPermisoMarketing();
  const [{ data: guiones, error: errorGuiones }, { data: publicaciones, error: errorPublicaciones }] = await Promise.all([
    supabase.from("guiones").select("id").eq("marca_id", id).limit(1),
    supabase.from("publicaciones").select("id").eq("marca_id", id).limit(1),
  ]);
  if (errorGuiones || errorPublicaciones) {
    throw new Error(errorGuiones?.message || errorPublicaciones?.message || "No se pudo verificar el uso de la marca.");
  }
  if (guiones?.length || publicaciones?.length) {
    throw new Error("Esta marca ya tiene contenido asociado. Archívala para conservar el historial.");
  }
  const { error } = await supabase.from("marcas").delete().eq("id", id).select("id").single();
  if (error) throw new Error(error.message);
  invalidarMarketing();
}

export async function guardarGuion(input: GuionInput) {
  const { supabase, user } = await clienteConPermisoMarketing();
  if (!input.titulo.trim() || !input.plataforma.trim() || !input.formato.trim()) {
    throw new Error("Completa título, plataforma y formato del guion.");
  }
  if (input.duracion_segundos !== null && (!Number.isInteger(input.duracion_segundos) || input.duracion_segundos < 0)) {
    throw new Error("La duración debe ser un número entero de segundos.");
  }
  const escenas = input.escenas.map((escena) => ({
    visual: escena.visual.trim(),
    audio: escena.audio.trim(),
    texto_pantalla: escena.texto_pantalla.trim(),
  }));
  const payload = {
    marca_id: input.marca_id,
    titulo: input.titulo.trim(),
    plataforma: input.plataforma.trim(),
    formato: input.formato.trim(),
    duracion_segundos: input.duracion_segundos,
    gancho: input.gancho.trim(),
    llamado_accion: input.llamado_accion.trim(),
    notas_grabacion: input.notas_grabacion.trim(),
    estado: input.estado,
  };
  const result = input.id
    ? await supabase.from("guiones").update(payload).eq("id", input.id).select("id").single()
    : await supabase.from("guiones").insert({ ...payload, creado_por: user.id }).select("id").single();
  if (result.error) throw new Error(result.error.message);
  const { error: errorEscenas } = await supabase.rpc("fn_reemplazar_escenas", {
    p_guion_id: result.data.id,
    p_escenas: escenas.map((escena, orden) => ({ ...escena, orden })),
  });
  if (errorEscenas) throw new Error(errorEscenas.message);
  invalidarMarketing();
}

export async function duplicarGuion(id: string) {
  const { supabase, user } = await clienteConPermisoMarketing();
  const { data: original, error } = await supabase.from("guiones").select("*, guion_escenas(*)").eq("id", id).single();
  if (error) throw new Error(error.message);
  const { data: copia, error: errorCopia } = await supabase.from("guiones").insert({
    marca_id: original.marca_id,
    titulo: `${original.titulo} (copia)`,
    plataforma: original.plataforma,
    formato: original.formato,
    duracion_segundos: original.duracion_segundos,
    gancho: original.gancho,
    llamado_accion: original.llamado_accion,
    notas_grabacion: original.notas_grabacion,
    estado: "borrador",
    creado_por: user.id,
  }).select("id").single();
  if (errorCopia) throw new Error(errorCopia.message);
  const { error: errorEscenas } = await supabase.rpc("fn_reemplazar_escenas", {
    p_guion_id: copia.id,
    p_escenas: (original.guion_escenas || []).sort((a: { orden: number }, b: { orden: number }) => a.orden - b.orden),
  });
  if (errorEscenas) throw new Error(errorEscenas.message);
  invalidarMarketing();
  return copia.id;
}

export async function eliminarGuion(id: string) {
  const { supabase } = await clienteConPermisoMarketing();
  const { error } = await supabase.from("guiones").delete().eq("id", id).select("id").single();
  if (error) throw new Error(error.message);
  invalidarMarketing();
}

export async function guardarPublicacion(input: PublicacionInput) {
  const { supabase, user } = await clienteConPermisoMarketing();
  if (!input.fecha_hora || Number.isNaN(Date.parse(input.fecha_hora))) {
    throw new Error("Selecciona una fecha y hora válidas.");
  }
  if (!input.plataforma.trim()) throw new Error("Selecciona una plataforma.");
  if (input.responsable_id) {
    const { data: perfil, error: errorPerfil } = await supabase.from("perfiles")
      .select("id").eq("id", input.responsable_id).eq("activo", true).single();
    if (errorPerfil || !perfil) throw new Error("El responsable debe ser un usuario activo.");
  }
  const payload = {
    marca_id: input.marca_id,
    plataforma: input.plataforma.trim(),
    fecha_hora: new Date(input.fecha_hora).toISOString(),
    guion_id: input.guion_id || null,
    caption: input.caption.trim(),
    hashtags: input.hashtags.map((tag) => tag.trim().replace(/^#/, "")).filter(Boolean),
    estado: input.estado,
    responsable_id: input.responsable_id || null,
    video_url: normalizarUrl(input.video_url, "video"),
    descarga_url: normalizarUrl(input.descarga_url, "descarga"),
    publicacion_url: normalizarUrl(input.publicacion_url, "publicación"),
  };
  const { error } = input.id
    ? await supabase.from("publicaciones").update(payload).eq("id", input.id).select("id").single()
    : await supabase.from("publicaciones").insert({ ...payload, creado_por: user.id });
  if (error) throw new Error(error.message);
  invalidarMarketing();
}

export async function moverPublicacion(id: string, fecha_hora: string) {
  const { supabase } = await clienteConPermisoMarketing();
  if (Number.isNaN(Date.parse(fecha_hora))) throw new Error("La nueva fecha no es válida.");
  const { error } = await supabase.from("publicaciones")
    .update({ fecha_hora: new Date(fecha_hora).toISOString() }).eq("id", id).select("id").single();
  if (error) throw new Error(error.message);
  invalidarMarketing();
}

export async function eliminarPublicacion(id: string) {
  const { supabase } = await clienteConPermisoMarketing();
  const { error } = await supabase.from("publicaciones").delete().eq("id", id).select("id").single();
  if (error) throw new Error(error.message);
  invalidarMarketing();
}

export async function marcarPublicacion(id: string, publicacionUrl: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Inicia sesión para publicar contenido.");
  const url = normalizarUrl(publicacionUrl, "publicación");
  const { error } = await supabase.rpc("fn_marcar_publicacion", {
    p_id: id,
    p_publicacion_url: url,
  });
  if (error) throw new Error(error.message);
  invalidarMarketing();
}
