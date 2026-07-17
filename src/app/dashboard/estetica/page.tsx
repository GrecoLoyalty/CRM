import { createClient } from "@/lib/supabase/server";
import CadenaEsteticaTarea from "@/components/estetica/CadenaEsteticaTarea";

const SIGUIENTE_ESTADO: Record<string, { estado: string; label: string }> = {
  camarografo: { estado: "GRABADO", label: "Marcar como Grabado" },
  editor: { estado: "EDICION_LISTA", label: "Marcar Edición Lista" },
  community_manager: { estado: "PUBLICADO", label: "Marcar Publicado" },
};

export default async function EsteticaPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: perfil } = await supabase.from("perfiles").select("*").eq("id", user!.id).single();

  const esLider = perfil?.role === "root" || perfil?.role === "ceo";

  let query = supabase
    .from("tareas")
    .select("*, cliente:clientes(*)")
    .eq("depto", "estetica")
    .neq("estado", "PUBLICADO")
    .order("fecha_pactada_entrega", { ascending: true, nullsFirst: false });

  if (!esLider) query = query.eq("asignado_a", user!.id);

  const { data: tareas } = await query;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold">Estética Visual</h1>
        <p className="text-gray-500 text-sm mt-1">
          Cadena de producción: Camarógrafo → Editor → Community Manager.
        </p>
      </div>

      {(!tareas || tareas.length === 0) && (
        <div className="card p-8 text-center text-gray-500">No tienes tareas activas por el momento.</div>
      )}

      <div className="space-y-3">
        {tareas?.map((t) => (
          <CadenaEsteticaTarea key={t.id} tarea={t} cliente={t.cliente} siguienteAccion={SIGUIENTE_ESTADO[t.subrol_requerido as string]} />
        ))}
      </div>
    </div>
  );
}
