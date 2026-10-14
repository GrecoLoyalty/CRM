import { createClient } from "@/lib/supabase/server";
import MarcasPanel from "@/components/marketing/MarcasPanel";

export default async function MarcasPage() {
  const supabase = createClient();
  const [{ data: marcas, error: errorMarcas }, { data: clientes, error: errorClientes }] = await Promise.all([
    supabase.from("marcas").select("*").order("nombre"),
    supabase.rpc("fn_clientes_para_marcas"),
  ]);
  if (errorMarcas || errorClientes) {
    console.error("[marketing] No se pudieron cargar las marcas y clientes:", errorMarcas?.message, errorClientes?.message);
    throw new Error("No se pudieron cargar las marcas y clientes.");
  }
  return <div className="max-w-6xl mx-auto"><MarcasPanel marcas={marcas || []} clientes={clientes || []} /></div>;
}
