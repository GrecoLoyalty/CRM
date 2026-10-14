import { createClient } from "@/lib/supabase/server";
import MarcasPanel from "@/components/marketing/MarcasPanel";

export default async function MarcasPage() {
  const supabase = createClient();
  const { data: marcas, error } = await supabase.from("marcas").select("*").order("nombre");
  if (error) {
    console.error("[marketing] No se pudieron cargar las marcas:", error.message);
    throw new Error("No se pudieron cargar las marcas.");
  }
  return <div className="max-w-6xl mx-auto"><MarcasPanel marcas={marcas || []} /></div>;
}
