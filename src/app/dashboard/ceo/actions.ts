"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { NivelUrgencia } from "@/lib/types";

export async function fijarFechaEtapa(clienteId: string, estado: string, fechaEstimada: string, comentario: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("clientes_etapas_historial").insert({
    cliente_id: clienteId,
    estado,
    fecha_estimada: fechaEstimada || null,
    comentario_publico: comentario || null,
    set_by: user!.id,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/ceo");
}

// Prende/apaga, por cliente, el botón "Ver mi ficha" en su portal. Pensado
// para dejarlo activo solo mientras haga falta, no de forma permanente.
export async function actualizarMostrarFicha(clienteId: string, mostrar: boolean) {
  const supabase = createClient();
  const { error } = await supabase.from("clientes").update({ mostrar_ficha_portal: mostrar }).eq("id", clienteId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/ceo");
}

// Aviso extra en el portal de un cliente puntual — separado del
// comentario de etapa. horasExpira es opcional (null = no expira solo,
// hay que desactivarlo a mano).
export async function crearAvisoPortal(clienteId: string, mensaje: string, nivel: NivelUrgencia, horasExpira?: number | null) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!mensaje.trim()) throw new Error("Escribe un mensaje para el aviso.");

  const { error } = await supabase.from("portal_avisos").insert({
    cliente_id: clienteId,
    mensaje: mensaje.trim(),
    nivel,
    creado_por: user!.id,
    expira_at: horasExpira ? new Date(Date.now() + horasExpira * 3600_000).toISOString() : null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/ceo");
}

export async function desactivarAvisoPortal(avisoId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("portal_avisos").update({ activo: false }).eq("id", avisoId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/ceo");
}

