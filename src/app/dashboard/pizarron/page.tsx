import { createClient } from "@/lib/supabase/server";
import PizarronEditor from "@/components/pizarron/PizarronEditor";
import type { Pizarron } from "@/lib/pizarron";

export default async function PizarronPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: propios, error: errorPropios }, { data: compartidos, error: errorCompartidos }, { data: perfil }] = await Promise.all([
    supabase
      .from("pizarrones")
      .select("*")
      .eq("creado_por", user.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("pizarrones_compartidos")
      .select("pizarron_id")
      .eq("perfil_id", user.id),
    supabase.from("perfiles").select("role").eq("id", user.id).single(),
  ]);

  if (errorPropios || errorCompartidos) {
    console.error("[pizarron] No se pudieron consultar los pizarrones:", errorPropios?.message, errorCompartidos?.message);
    throw new Error("No se pudieron cargar los pizarrones.");
  }

  const idsCompartidos = (compartidos || []).map((item) => item.pizarron_id);
  const { data: pizarronesCompartidos, error: errorPizarronesCompartidos } = idsCompartidos.length
    ? await supabase
        .from("pizarrones")
        .select("*")
        .in("id", idsCompartidos)
        .order("updated_at", { ascending: false })
    : { data: [], error: null };
  if (errorPizarronesCompartidos) {
    console.error("[pizarron] No se pudieron cargar los pizarrones compartidos:", errorPizarronesCompartidos.message);
    throw new Error("No se pudieron cargar los pizarrones compartidos.");
  }

  const pizarrones = [
    ...(propios || []).map((pizarron) => ({ ...pizarron, compartido: false })),
    ...(pizarronesCompartidos || [])
      .filter((pizarron) => pizarron.creado_por !== user.id)
      .map((pizarron) => ({ ...pizarron, compartido: true })),
  ].sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  const puedeAdministrar = perfil?.role === "root" || perfil?.role === "ceo";
  if (puedeAdministrar) {
    const { data: administrables, error: errorAdministrables } = await supabase
      .from("pizarrones")
      .select("*")
      .order("updated_at", { ascending: false });
    if (errorAdministrables) {
      console.error("[pizarron] No se pudieron cargar todos los pizarrones para administración:", errorAdministrables.message);
      throw new Error("No se pudieron cargar los pizarrones.");
    }
    const porId = new Map(pizarrones.map((pizarron) => [pizarron.id, pizarron]));
    for (const pizarron of administrables || []) {
      if (!porId.has(pizarron.id)) {
        porId.set(pizarron.id, { ...pizarron, compartido: false });
      }
    }
    pizarrones.splice(0, pizarrones.length, ...Array.from(porId.values()));
  }

  return (
    <div className="max-w-[1500px] mx-auto">
      <PizarronEditor
        pizarrones={(pizarrones || []) as Pizarron[]}
        userId={user.id}
        puedeAdministrar={puedeAdministrar}
      />
    </div>
  );
}
