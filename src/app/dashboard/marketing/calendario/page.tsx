import { createClient } from "@/lib/supabase/server";
import CalendarioMarketing from "@/components/marketing/CalendarioMarketing";

export default async function CalendarioMarketingPage() {
  const supabase = createClient();
  const [{ data: marcas, error: errorMarcas }, { data: perfiles, error: errorPerfiles }, { data: guiones, error: errorGuiones }, { data: publicaciones, error: errorPublicaciones }] = await Promise.all([
    supabase.from("marcas").select("id, nombre, color, plataformas_activas, activa").order("nombre"),
    supabase.from("perfiles").select("id, nombre_completo").eq("activo", true).order("nombre_completo"),
    supabase.from("guiones").select("id, marca_id, titulo").order("titulo"),
    supabase.from("publicaciones").select("*").order("fecha_hora"),
  ]);
  if (errorMarcas || errorPerfiles || errorGuiones || errorPublicaciones) {
    console.error("[marketing] No se pudo cargar el calendario:", errorMarcas?.message, errorPerfiles?.message, errorGuiones?.message, errorPublicaciones?.message);
    throw new Error("No se pudo cargar el calendario de contenido.");
  }
  return <div className="max-w-[1500px] mx-auto"><CalendarioMarketing marcas={marcas || []} perfiles={perfiles || []} guiones={guiones || []} publicaciones={publicaciones || []} /></div>;
}
