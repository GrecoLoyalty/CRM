import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { createClient } from "@/lib/supabase/server";
import TareaManualCard from "@/components/tareas/TareaManualCard";
import { DEPTO_LABEL, type Depto } from "@/lib/types";

const RUTA_DEPTO: Record<string, string> = {
  estetica: "/dashboard/estetica",
  desarrollo: "/dashboard/desarrollo",
};

// Una sola lista de trabajo por persona: lo que te asignaron directo y lo que
// te toca dentro del flujo de producción de cada cliente.
export default async function MisTareasPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: tareas }, { data: delFlujo }] = await Promise.all([
    supabase
      .from("tareas")
      .select("*, cliente:clientes(id, nombre_empresa), creador:perfiles!creado_por(nombre_completo)")
      .eq("asignado_a", user!.id)
      .eq("origen", "manual")
      .order("created_at", { ascending: false }),
    supabase
      .from("tareas")
      .select("id, titulo, depto, estado, fecha_pactada_entrega, cliente:clientes(id, nombre_empresa)")
      .eq("asignado_a", user!.id)
      .neq("origen", "manual")
      .not("estado", "in", "(PUBLICADO,COMPLETADA)")
      .order("fecha_pactada_entrega", { ascending: true, nullsFirst: false }),
  ]);

  const hayFlujo = (delFlujo || []).length > 0;
  const hayManuales = (tareas || []).length > 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold">Mis tareas</h1>
        <p className="text-gray-500 text-sm mt-1">
          Todo tu trabajo en un solo lugar: lo que te asignaron directamente y lo que te toca dentro del flujo de
          cada cliente. Marca tu avance — quien te asignó la tarea ve cada cambio.
        </p>
      </div>

      {!hayFlujo && !hayManuales && (
        <div className="card p-8 text-center text-gray-500 text-sm">No tienes tareas pendientes por ahora.</div>
      )}

      {hayFlujo && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Del flujo de producción</h2>
          {(delFlujo || []).map((t: any) => {
            const ruta = RUTA_DEPTO[t.depto];
            return (
              <div key={t.id} className="card p-4 flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-base-700 text-gray-400">{DEPTO_LABEL[t.depto as Depto] ?? t.depto}</span>
                    {t.cliente?.nombre_empresa && (
                      <Link href={`/dashboard/cliente/${t.cliente.id}`} className="text-xs px-2 py-0.5 rounded-full bg-base-700 text-gray-400 hover:text-gray-200">
                        🏢 {t.cliente.nombre_empresa}
                      </Link>
                    )}
                  </div>
                  <p className="font-medium">{t.titulo}</p>
                  {t.fecha_pactada_entrega && (
                    <p className="text-xs text-gray-500 mt-1">
                      Entrega: {format(new Date(t.fecha_pactada_entrega + "T12:00:00"), "d 'de' MMM yyyy", { locale: es })}
                    </p>
                  )}
                </div>
                {ruta && (
                  <Link href={ruta} className="btn-secondary text-sm">
                    Trabajar en esto
                  </Link>
                )}
              </div>
            );
          })}
        </section>
      )}

      {hayManuales && (
        <section className="space-y-3">
          {hayFlujo && <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Asignadas directamente</h2>}
          {(tareas || []).map((t: any) => (
            <TareaManualCard key={t.id} tarea={t} />
          ))}
        </section>
      )}
    </div>
  );
}
