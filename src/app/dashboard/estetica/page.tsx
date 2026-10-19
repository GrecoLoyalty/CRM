import { createClient } from "@/lib/supabase/server";
import CadenaEsteticaTarea from "@/components/estetica/CadenaEsteticaTarea";
import AsignarTareaManual from "@/components/ceo/AsignarTareaManual";
import type { Depto } from "@/lib/types";

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
  const [{ data: perfilesActivos }, { data: deptosExtra }, { data: clientes }] = await Promise.all([
    supabase.from("perfiles").select("id, nombre_completo, subrol, depto").eq("activo", true).order("nombre_completo"),
    supabase.from("perfiles_departamentos").select("perfil_id, depto"),
    supabase.from("clientes").select("id, nombre_empresa").neq("estado", "HISTORICO").order("nombre_empresa"),
  ]);
  const deptoTarea: Depto = "estetica";
  const miembrosEstetica = new Set(
    (perfilesActivos || [])
      .filter((p) => p.depto === deptoTarea || (deptosExtra || []).some((d) => d.perfil_id === p.id && d.depto === deptoTarea))
      .map((p) => p.id)
  );
  const perfilesEstetica = (perfilesActivos || [])
    .filter((p) => miembrosEstetica.has(p.id))
    .map((p) => ({ id: p.id, nombre_completo: p.nombre_completo, subrol: p.subrol }));
  const deptosPorPersona: Record<string, Depto[]> = {};
  for (const id of miembrosEstetica) deptosPorPersona[id] = [deptoTarea];

  // Mismo problema que existía en Ventas: si Root te agrega al "Equipo
  // asignado" de un cliente desde Panel Root → Clientes, eso se guarda en
  // `cliente_equipo`, pero antes esta página solo miraba `tareas.asignado_a`
  // — así que quien fuera agregado al equipo sin tener una tarea propia
  // asignada no veía absolutamente nada. Ahora se muestran también las
  // tareas de los clientes donde formas parte del equipo de Estética.
  let idsPorEquipo: string[] = [];
  if (!esLider) {
    const { data: equipo } = await supabase
      .from("cliente_equipo")
      .select("cliente_id")
      .eq("perfil_id", user!.id)
      .eq("depto", "estetica");
    idsPorEquipo = (equipo || []).map((e) => e.cliente_id);
  }

  let query = supabase
    .from("tareas")
    .select("*, cliente:clientes(*)")
    .eq("depto", "estetica")
    .neq("estado", "PUBLICADO")
    .neq("estado", "COMPLETADA")
    .order("fecha_pactada_entrega", { ascending: true, nullsFirst: false });

  if (!esLider) {
    query = idsPorEquipo.length > 0
      ? query.or(`asignado_a.eq.${user!.id},cliente_id.in.(${idsPorEquipo.join(",")})`)
      : query.eq("asignado_a", user!.id);
  }

  const { data: tareas } = await query;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold">Estética Visual</h1>
        <p className="text-gray-500 text-sm mt-1">
          Cadena de producción: Camarógrafo → Editor → Community Manager.
        </p>
      </div>

      {esLider && (
        <details className="card p-4">
          <summary className="btn-primary inline-flex cursor-pointer list-none">
            + Agregar tarea de Estética Visual
          </summary>
          <div className="mt-4">
            <AsignarTareaManual
              perfiles={perfilesEstetica}
              deptosPorPersona={deptosPorPersona}
              clientes={clientes || []}
              deptoFijo={deptoTarea}
            />
          </div>
        </details>
      )}

      {(!tareas || tareas.length === 0) && (
        <div className="card p-8 text-center text-gray-500">No tienes tareas activas por el momento.</div>
      )}

      <div className="space-y-3">
        {tareas?.map((t) => (
          <CadenaEsteticaTarea
            key={t.id}
            tarea={t}
            cliente={t.cliente}
            siguienteAccion={t.origen === "manual"
              ? { estado: "COMPLETADA", label: "Marcar como Completada" }
              : SIGUIENTE_ESTADO[t.subrol_requerido as string]}
            puedeEliminar={perfil?.role === "root"}
            depto="estetica"
          />
        ))}
      </div>
    </div>
  );
}
