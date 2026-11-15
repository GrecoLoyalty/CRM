"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type Rol = "root" | "ceo" | "vendedor" | string;

async function contexto() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  const { data: perfil } = await supabase.from("perfiles").select("role").eq("id", user.id).single();
  return { supabase, user, rol: (perfil?.role || "") as Rol };
}

function texto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

function monto(formData: FormData, campo: string) {
  const n = Number(String(formData.get(campo) ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

// ---------------------------------------------------------------------
// Alta de preventa (gente de campo). Devuelve el folio y el token para
// que la UI muestre el link del ticket de inmediato.
// ---------------------------------------------------------------------
export async function crearPreventa(formData: FormData) {
  const { supabase, user, rol } = await contexto();
  if (!["vendedor", "root", "ceo"].includes(rol)) throw new Error("Sin permiso para registrar preventas.");

  const nombre_cliente = texto(formData, "nombre_cliente");
  const nombre_negocio = texto(formData, "nombre_negocio");
  const telefono = texto(formData, "telefono");
  const email = texto(formData, "email").toLowerCase();
  const direccion = texto(formData, "direccion");
  const producto = texto(formData, "producto");
  const cantidad = Math.floor(monto(formData, "cantidad") || 1);
  const monto_total = monto(formData, "monto_total");
  const monto_anticipo = monto(formData, "monto_anticipo");
  const notas = texto(formData, "notas") || null;

  if (!nombre_cliente || !nombre_negocio || !telefono || !email || !direccion || !producto) {
    throw new Error("Faltan datos del cliente: nombre, negocio, teléfono, correo y dirección son obligatorios.");
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("El correo no tiene un formato válido.");
  if (telefono.replace(/\D/g, "").length < 10) throw new Error("El teléfono debe tener al menos 10 dígitos.");
  if (!Number.isFinite(monto_total) || monto_total < 0) throw new Error("El monto total no es válido.");
  if (!Number.isFinite(monto_anticipo) || monto_anticipo < 0) throw new Error("El monto del anticipo no es válido.");
  if (monto_anticipo > monto_total) throw new Error("El anticipo no puede ser mayor al total.");
  if (cantidad < 1) throw new Error("La cantidad debe ser al menos 1.");

  // Camino A: ya recibió el dinero. Camino B: pendiente (ticket muestra datos bancarios).
  const pagado = texto(formData, "camino") === "pagado";
  const metodo = texto(formData, "pago_metodo") || "efectivo";
  if (pagado && !["efectivo", "transferencia", "otro"].includes(metodo)) throw new Error("Método de pago inválido.");

  const { data, error } = await supabase
    .from("preventas")
    .insert({
      nombre_cliente,
      nombre_negocio,
      telefono,
      email,
      direccion,
      producto,
      cantidad,
      monto_total,
      monto_anticipo,
      notas,
      anticipo_pagado: pagado,
      pago_metodo: pagado ? metodo : null,
      pago_fecha: pagado ? new Date().toISOString() : null,
      pago_registrado_por: pagado ? user.id : null,
      vendedor_id: user.id,
    })
    .select("id, folio, ticket_token")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/preventas");
  return { folio: data.folio as string, token: data.ticket_token as string, pagado };
}

// ---------------------------------------------------------------------
// Gestión (solo Root/CEO): confirmar pago y cambiar estado
// ---------------------------------------------------------------------
export async function confirmarPagoPreventa(id: string, metodo: "efectivo" | "transferencia" | "otro") {
  const { supabase, user, rol } = await contexto();
  if (!["root", "ceo"].includes(rol)) throw new Error("Solo Root o CEO pueden confirmar pagos.");

  const { error } = await supabase
    .from("preventas")
    .update({
      anticipo_pagado: true,
      pago_metodo: metodo,
      pago_fecha: new Date().toISOString(),
      pago_registrado_por: user.id,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/preventas");
}

export async function revertirPagoPreventa(id: string) {
  const { supabase, rol } = await contexto();
  if (rol !== "root") throw new Error("Solo Root puede revertir un pago.");

  const { error } = await supabase
    .from("preventas")
    .update({ anticipo_pagado: false, pago_metodo: null, pago_fecha: null, pago_registrado_por: null })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/preventas");
}

export async function cambiarEstadoPreventa(id: string, estado: string) {
  const { supabase, rol } = await contexto();
  if (!["root", "ceo"].includes(rol)) throw new Error("Solo Root o CEO pueden cambiar el estado.");
  if (!["activa", "enviada", "entregada", "cancelada"].includes(estado)) throw new Error("Estado inválido.");

  const { error } = await supabase.from("preventas").update({ estado }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/preventas");
}

// ---------------------------------------------------------------------
// Panel global (solo Root): avance, datos bancarios, actualizaciones
// ---------------------------------------------------------------------
async function soloRoot() {
  const ctx = await contexto();
  if (ctx.rol !== "root") throw new Error("Solo Root puede modificar esta configuración.");
  return ctx;
}

export async function guardarAvanceGlobal(formData: FormData) {
  const { supabase, user } = await soloRoot();

  const etapa = Number(formData.get("etapa_actual"));
  if (!Number.isInteger(etapa) || etapa < 1 || etapa > 5) throw new Error("Etapa inválida.");

  const fecha = texto(formData, "fecha_estimada_envio");
  if (fecha && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new Error("Fecha inválida.");

  const { error } = await supabase
    .from("preventas_config")
    .update({
      etapa_actual: etapa,
      fecha_estimada_envio: fecha || null,
      mensaje_general: texto(formData, "mensaje_general") || null,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", "principal");
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/preventas");
}

export async function guardarInstruccionesPago(formData: FormData) {
  const { supabase, user } = await soloRoot();
  const { error } = await supabase
    .from("preventas_config")
    .update({
      instrucciones_pago: texto(formData, "instrucciones_pago") || null,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", "principal");
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/preventas");
}

// Cuentas de pago (carrusel del ticket). Con id = editar; sin id = crear.
export async function guardarCuentaPago(formData: FormData) {
  const { supabase } = await soloRoot();

  const id = texto(formData, "id");
  const banco = texto(formData, "banco");
  const titular = texto(formData, "titular");
  const clabe = texto(formData, "clabe").replace(/\s/g, "");
  const numero_cuenta = texto(formData, "numero_cuenta");
  const etiqueta = texto(formData, "etiqueta") || null;

  if (!banco) throw new Error("El banco es obligatorio.");
  if (!titular) throw new Error("El nombre completo del titular es obligatorio.");
  if (!clabe && !numero_cuenta) throw new Error("Captura la CLABE o el número de cuenta.");
  if (clabe && !/^\d{18}$/.test(clabe)) throw new Error("La CLABE debe tener exactamente 18 dígitos.");

  const fila = { banco, titular, clabe: clabe || null, numero_cuenta: numero_cuenta || null, etiqueta };
  const { error } = id
    ? await supabase.from("preventas_cuentas").update(fila).eq("id", id)
    : await supabase.from("preventas_cuentas").insert({ ...fila, orden: Date.now() % 1000000 });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/preventas");
}

export async function alternarCuentaPago(id: string, activa: boolean) {
  const { supabase } = await soloRoot();
  const { error } = await supabase.from("preventas_cuentas").update({ activa }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/preventas");
}

export async function eliminarCuentaPago(id: string) {
  const { supabase } = await soloRoot();
  const { error } = await supabase.from("preventas_cuentas").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/preventas");
}

export async function publicarActualizacion(formData: FormData) {
  const { supabase, user } = await soloRoot();

  const titulo = texto(formData, "titulo");
  if (!titulo) throw new Error("El título es obligatorio.");

  const { error } = await supabase.from("preventas_actualizaciones").insert({
    titulo,
    mensaje: texto(formData, "mensaje") || null,
    creado_por: user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/preventas");
}

export async function eliminarActualizacion(id: string) {
  const { supabase } = await soloRoot();
  const { error } = await supabase.from("preventas_actualizaciones").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/preventas");
}
