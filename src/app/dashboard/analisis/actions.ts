"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function guardarBriefing(clienteId: string, formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("clientes")
    .update({
      briefing_texto: formData.get("briefing_texto") as string,
      ruta_visual: formData.get("ruta_visual") === "on",
      ruta_software: formData.get("ruta_software") === "on",
      fecha_entrega_estimada: (formData.get("fecha_entrega_estimada") as string) || null,
      analista_id: user!.id,
      estado: "EN_ANALISIS",
    })
    .eq("id", clienteId);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/analisis");
}

export async function enviarAProduccion(clienteId: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("fn_enviar_a_produccion", { p_cliente_id: clienteId });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/analisis");
}
