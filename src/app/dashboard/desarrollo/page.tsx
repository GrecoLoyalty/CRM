import { createClient } from "@/lib/supabase/server";
import CadenaEsteticaTarea from "@/components/estetica/CadenaEsteticaTarea";
import SuiteAppCard from "@/components/desarrollo/SuiteAppCard";

export default async function DesarrolloPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: perfil } = await supabase.from("perfiles").select("*").eq("id", user!.id).single();
  const esLider = perfil?.role === "root" || perfil?.role === "ceo";

  // Mismo fix que en Estética/Ventas: considerar también cliente_equipo,
  // no solo tareas.asignado_a, para que "Equipo asignado" (Panel Root →
  // Clientes) sí le muestre algo a la persona marcada en el checklist.
  let idsPorEquipo: string[] = [];
  if (!esLider) {
    const { data: equipo } = await supabase
      .from("cliente_equipo")
      .select("cliente_id")
      .eq("perfil_id", user!.id)
      .eq("depto", "desarrollo");
    idsPorEquipo = (equipo || []).map((e) => e.cliente_id);
  }

  let query = supabase
    .from("tareas")
    .select("*, cliente:clientes(*)")
    .eq("depto", "desarrollo")
    .neq("estado", "COMPLETADA")
    .order("fecha_pactada_entrega", { ascending: true, nullsFirst: false });

  if (!esLider) {
    query = idsPorEquipo.length > 0
      ? query.or(`asignado_a.eq.${user!.id},cliente_id.in.(${idsPorEquipo.join(",")})`)
      : query.eq("asignado_a", user!.id);
  }
  const { data: tareas } = await query;

  const { data: apps } = await supabase.from("suite_apps").select("*").order("veces_reutilizada", { ascending: false });

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      <div>
        <h1 className="text-2xl font-display font-semibold">Desarrollo de Software</h1>
        <p className="text-gray-500 text-sm mt-1">Soluciones técnicas construidas o adaptadas de la Suite GRESANOVA.</p>
      </div>

      <section className="space-y-3">
        <h2 className="font-display font-semibold text-sm text-gray-400 uppercase tracking-wide">Tus tareas</h2>
        {(!tareas || tareas.length === 0) && (
          <div className="card p-8 text-center text-gray-500">No tienes tareas activas por el momento.</div>
        )}
        {tareas?.map((t) => (
          <CadenaEsteticaTarea key={t.id} tarea={t} cliente={t.cliente} siguienteAccion={{ estado: "COMPLETADA", label: "Marcar Completada" }} />
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-display font-semibold text-sm text-gray-400 uppercase tracking-wide">Librería de la Suite GRESANOVA</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {apps?.map((app) => (
            <SuiteAppCard key={app.id} app={app} />
          ))}
          {(!apps || apps.length === 0) && (
            <p className="text-gray-500 text-sm col-span-3">
              Aún no hay apps catalogadas. Agrega la primera desde Supabase (tabla <code>suite_apps</code>) para empezar a construir el historial de reutilización.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
