"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { TipoMovimientoCaja } from "@/lib/types";

async function asegurarRootOCeo() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: miPerfil } = await supabase.from("perfiles").select("role").eq("id", user.id).single();
  if (miPerfil?.role !== "root" && miPerfil?.role !== "ceo") {
    throw new Error("Solo Root o CEO pueden registrar movimientos de caja.");
  }
  return { supabase, user };
}

// Registra un ingreso o un egreso desde el banner. Si tipo='ingreso' y
// categoria='venta', ese movimiento también cuenta en la gráfica de ventas.
export async function registrarMovimientoCaja(input: {
  tipo: TipoMovimientoCaja;
  categoria: string;
  concepto: string;
  monto: number;
  clienteId?: string | null;
  fecha?: string;
}) {
  const { supabase, user } = await asegurarRootOCeo();

  if (!input.concepto.trim()) throw new Error("El concepto es obligatorio.");
  if (!input.monto || input.monto <= 0) throw new Error("El monto debe ser mayor a 0.");

  const { error } = await supabase.from("movimientos_caja").insert({
    tipo: input.tipo,
    categoria: input.categoria || "otro",
    concepto: input.concepto.trim(),
    monto: input.monto,
    cliente_id: input.clienteId || null,
    fecha: input.fecha || new Date().toISOString().slice(0, 10),
    registrado_por: user.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/ceo");
  revalidatePath("/dashboard/ceo/finanzas");
  revalidatePath("/dashboard/vista-aguila");
}

export async function eliminarMovimientoCaja(id: string) {
  await asegurarRootOCeo();
  const supabase = createClient();

  const { error } = await supabase.from("movimientos_caja").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/ceo");
  revalidatePath("/dashboard/ceo/finanzas");
  revalidatePath("/dashboard/vista-aguila");
}
