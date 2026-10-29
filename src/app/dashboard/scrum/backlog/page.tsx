import { createClient } from "@/lib/supabase/server";
import FilaBacklog from "@/components/scrum/FilaBacklog";
import FormItem from "@/components/scrum/FormItem";
import type { ScrumItem, Sprint } from "@/lib/types";

export default async function BacklogPage() {
  const supabase = createClient();
  const [{ data: esGestorData }, { data: itemsData }, { data: sprintsData }, { data: clientes }] = await Promise.all([
    supabase.rpc("fn_scrum_es_gestor"),
    supabase
      .from("scrum_items")
      .select("*, cliente:clientes(nombre_empresa)")
      .is("sprint_id", null)
      .order("orden", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase.from("sprints").select("id, nombre, estado").in("estado", ["planificado", "activo"]).order("fecha_inicio"),
    supabase.from("clientes").select("id, nombre_empresa").neq("estado", "HISTORICO").order("nombre_empresa"),
  ]);

  const items = (itemsData || []) as ScrumItem[];
  const esGestor = !!esGestorData;
  const sprints = (sprintsData || []) as Pick<Sprint, "id" | "nombre" | "estado">[];
  const sinEstimar = items.filter((i) => i.horas_estimadas == null).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-semibold text-lg">Product Backlog</h2>
        <p className="text-sm text-gray-500 mt-1">
          Lista única y ordenada por prioridad: arriba lo más importante. La ordena el Product Owner y la aprueba el CTO.
          {" "}{items.length} tarjeta(s){sinEstimar ? `, ${sinEstimar} sin estimar` : ""}.
        </p>
      </div>

      <details className="card p-4">
        <summary className="btn-primary inline-flex cursor-pointer list-none">+ Nueva tarjeta</summary>
        <div className="mt-4">
          <FormItem clientes={clientes || []} />
        </div>
      </details>

      <div className="space-y-2">
        {items.map((item, idx) => (
          <FilaBacklog
            key={item.id}
            item={item}
            posicion={idx + 1}
            esGestor={esGestor}
            sprintsAbiertos={sprints}
            esPrimero={idx === 0}
            esUltimo={idx === items.length - 1}
          />
        ))}
        {items.length === 0 && (
          <div className="card p-8 text-center text-gray-500">El backlog está vacío.</div>
        )}
      </div>
    </div>
  );
}
