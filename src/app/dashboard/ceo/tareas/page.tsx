import { createClient } from "@/lib/supabase/server";
import AsignarTareaManual from "@/components/ceo/AsignarTareaManual";
import SeguimientoTareasManuales from "@/components/ceo/SeguimientoTareasManuales";
import type { Depto } from "@/lib/types";

export default async function TareasManualesPage() {
  const supabase = createClient();

  const [{ data: perfiles }, { data: deptosExtra }, { data: clientes }, { data: tareasManuales }] = await Promise.all([
    supabase.from("perfiles").select("id, nombre_completo, role, depto, subrol").eq("activo", true).order("nombre_completo"),
    supabase.from("perfiles_departamentos").select("perfil_id, depto"),
    supabase
      .from("clientes")
      .select("id, nombre_empresa")
      .neq("estado", "HISTORICO")
      .order("nombre_empresa"),
    supabase
      .from("tareas")
      .select(
        "id, titulo, depto, estado, respuesta_estado, link_entregable, fecha_pactada_entrega, asignado_a, cliente_id, created_at, perfiles!asignado_a(nombre_completo), clientes(nombre_empresa)"
      )
      .eq("origen", "manual")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const deptosPorPersona: Record<string, Depto[]> = {};
  for (const p of perfiles || []) {
    if (p.depto) deptosPorPersona[p.id] = [p.depto as Depto];
  }
  for (const fila of deptosExtra || []) {
    if (!deptosPorPersona[fila.perfil_id]) deptosPorPersona[fila.perfil_id] = [];
    if (!deptosPorPersona[fila.perfil_id].includes(fila.depto as Depto)) {
      deptosPorPersona[fila.perfil_id].push(fila.depto as Depto);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold">Asignar tarea</h1>
        <p className="text-gray-500 text-sm mt-1">
          Crea una tarea directa para cualquier persona activa: puede ser interna (sin cliente) o relacionada a un
          cliente puntual, sin depender del flujo automático de briefing/producción.
        </p>
      </div>

      <AsignarTareaManual
        perfiles={(perfiles || []).map((p) => ({ id: p.id, nombre_completo: p.nombre_completo, subrol: p.subrol }))}
        deptosPorPersona={deptosPorPersona}
        clientes={clientes || []}
      />

      <div className="card p-5">
        <h2 className="font-display font-semibold mb-3">Últimas tareas asignadas manualmente</h2>
        {(tareasManuales || []).length === 0 && <p className="text-sm text-gray-500">Aún no has asignado ninguna tarea directa.</p>}
        <SeguimientoTareasManuales tareas={(tareasManuales || []) as any} />
      </div>
    </div>
  );
}
