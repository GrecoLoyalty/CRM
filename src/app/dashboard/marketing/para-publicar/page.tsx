import { createClient } from "@/lib/supabase/server";
import ParaPublicarPanel from "@/components/marketing/ParaPublicarPanel";

export default async function ParaPublicarPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const ahora = new Date();
  const desde = new Date(ahora);
  desde.setDate(desde.getDate() - 1);
  desde.setHours(0, 0, 0, 0);
  const hasta = new Date(ahora);
  hasta.setDate(hasta.getDate() + 8);
  hasta.setHours(23, 59, 59, 999);
  const [{ data: publicaciones, error: errorPublicaciones }, { data: marcas, error: errorMarcas }] = await Promise.all([
    supabase.from("publicaciones").select("id, marca_id, plataforma, fecha_hora, caption, hashtags, video_url, descarga_url, publicacion_url")
      .eq("responsable_id", user.id).eq("estado", "pendiente")
      .gte("fecha_hora", desde.toISOString()).lte("fecha_hora", hasta.toISOString()).order("fecha_hora"),
    supabase.from("marcas").select("id, nombre, color"),
  ]);
  if (errorPublicaciones || errorMarcas) {
    console.error("[marketing] No se pudieron cargar los pendientes de publicación:", errorPublicaciones?.message, errorMarcas?.message);
    throw new Error("No se pudieron cargar tus pendientes de publicación.");
  }
  return <ParaPublicarPanel publicaciones={publicaciones || []} marcas={marcas || []} />;
}
