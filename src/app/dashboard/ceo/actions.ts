"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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
