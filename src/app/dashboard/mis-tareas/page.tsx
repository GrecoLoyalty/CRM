import { createClient } from "@/lib/supabase/server";
import TareaManualCard from "@/components/tareas/TareaManualCard";

export default async function MisTareasPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: tareas } = await supabase
    .from("tareas")
    .select("*, cliente:clientes(id, nombre_empresa), creador:perfiles!creado_por(nombre_completo)")
    .eq("asignado_a", user!.id)
    .eq("origen", "manual")
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold">Mis tareas</h1>
        <p className="text-gray-500 text-sm mt-1">
          Tareas que te asignaron directamente (con o sin cliente). Marca tu avance conforme vayas trabajando en
          ellas — quien te la asignó puede ver cada cambio.
        </p>
      </div>

      {(!tareas || tareas.length === 0) && (
        <div className="card p-8 text-center text-gray-500 text-sm">No tienes tareas asignadas directamente por ahora.</div>
      )}

      <div className="space-y-3">
        {(tareas || []).map((t: any) => (
          <TareaManualCard key={t.id} tarea={t} />
        ))}
      </div>
    </div>
  );
}
