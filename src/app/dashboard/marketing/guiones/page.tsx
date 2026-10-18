import { createClient } from "@/lib/supabase/server";
import GuionesPanel from "@/components/marketing/GuionesPanel";

export default async function GuionesPage() {
  const supabase = createClient();
  const [{ data: guiones, error: errorGuiones }, { data: marcas, error: errorMarcas }] = await Promise.all([
    supabase.from("guiones").select("*, guion_escenas(*)").order("updated_at", { ascending: false }),
    supabase.from("marcas").select("id, nombre, color, plataformas_activas, activa, predeterminada").order("nombre"),
  ]);
  if (errorGuiones || errorMarcas) {
    console.error("[marketing] No se pudieron cargar los guiones o marcas:", errorGuiones?.message, errorMarcas?.message);
    throw new Error("No se pudieron cargar los guiones.");
  }
  return <div className="max-w-6xl mx-auto"><GuionesPanel guiones={guiones || []} marcas={marcas || []} /></div>;
}
