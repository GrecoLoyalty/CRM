"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function crearProspecto(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const telefono = formData.get("telefono") as string;
  const nombre_empresa = formData.get("nombre_empresa") as string;

  // Detección simple de duplicados: mismo teléfono o empresa con nombre muy similar
  const { data: posiblesDuplicados } = await supabase
    .from("clientes")
    .select("id, nombre_empresa, telefono")
    .or(`telefono.eq.${telefono},nombre_empresa.ilike.%${nombre_empresa}%`);

  const { data: nuevoCliente, error } = await supabase
    .from("clientes")
    .insert({
      nombre_contacto: formData.get("nombre_contacto"),
      nombre_empresa,
      giro_id: formData.get("giro_id") || null,
      telefono,
      email: formData.get("email") || null,
      necesidad_detectada: formData.get("necesidad_detectada"),
      fuente_lead: formData.get("fuente_lead") || null,
      presupuesto_estimado: formData.get("presupuesto_estimado") || null,
      vendedor_id: user.id,
      estado: "PROSPECTO",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  if (posiblesDuplicados && posiblesDuplicados.length > 0 && nuevoCliente) {
    await supabase.from("clientes_duplicados_alertas").insert(
      posiblesDuplicados.map((d) => ({
        cliente_nuevo_id: nuevoCliente.id,
        cliente_existente_id: d.id,
        motivo: d.telefono === telefono ? "Teléfono coincide" : "Nombre de empresa similar",
      }))
    );
  }

  revalidatePath("/dashboard/ventas");
}

export async function cerrarGanado(clienteId: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("fn_convertir_prospecto", { p_cliente_id: clienteId });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/ventas");
}
