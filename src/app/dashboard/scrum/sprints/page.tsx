import { format } from "date-fns";
import { es } from "date-fns/locale";
import { createClient } from "@/lib/supabase/server";
import CapacidadSprint from "@/components/scrum/CapacidadSprint";
import EquipoScrum from "@/components/scrum/EquipoScrum";
import { AccionesSprint, FormNuevoSprint } from "@/components/scrum/SprintAdmin";
import { DOD, calcularCapacidad } from "@/lib/scrum";
import type { MiembroScrum, ScrumItem, Sprint } from "@/lib/types";

const fecha = (d: string) => format(new Date(`${d}T00:00:00`), "d MMM yyyy", { locale: es });

const BADGE_ESTADO = {
  planificado: "badge-neutral",
  activo: "badge-ok",
  cerrado: "badge-neutral",
} as const;

export default async function SprintsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: perfil } = await supabase.from("perfiles").select("role").eq("id", user!.id).single();
  const esAprobador = perfil?.role === "root" || perfil?.role === "ceo";

  const [{ data: esGestorData }, { data: sprintsData }, { data: itemsData }, { data: equipoData }, { data: perfiles }] =
    await Promise.all([
      supabase.rpc("fn_scrum_es_gestor"),
      supabase.from("sprints").select("*").order("fecha_inicio", { ascending: false }),
      supabase.from("scrum_items").select("sprint_id, tipo, horas_estimadas, cliente_id, estado").not("sprint_id", "is", null),
      supabase.from("scrum_equipo").select("*, perfil:perfiles(nombre_completo)"),
      supabase.from("perfiles").select("id, nombre_completo").eq("activo", true).order("nombre_completo"),
    ]);

  const esGestor = !!esGestorData;
  const sprints = (sprintsData || []) as Sprint[];
  const items = (itemsData || []) as Pick<ScrumItem, "sprint_id" | "tipo" | "horas_estimadas" | "cliente_id" | "estado">[];
  const equipo = (equipoData || []) as MiembroScrum[];

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h2 className="font-display font-semibold text-lg">Equipo y capacidad</h2>
        <p className="text-sm text-gray-500">
          La capacidad del sprint sale de las horas por semana de cada persona multiplicadas por su dedicación a
          desarrollo. Los asesores no cuentan.
        </p>
        <div className="card p-4">
          <EquipoScrum miembros={equipo} perfiles={perfiles || []} puedeEditar={esAprobador} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display font-semibold text-lg">Sprints</h2>
        {esGestor && (
          <details className="card p-4">
            <summary className="btn-primary inline-flex cursor-pointer list-none">+ Nuevo sprint</summary>
            <div className="mt-4">
              <FormNuevoSprint />
            </div>
          </details>
        )}

        {sprints.map((s) => {
          const delSprint = items.filter((i) => i.sprint_id === s.id);
          const hechas = delSprint.filter((i) => i.estado === "hecho").length;
          const cap = calcularCapacidad(equipo, s, delSprint);
          return (
            <div key={s.id} className="card p-5 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-semibold">{s.nombre}</h3>
                    <span className={`badge ${BADGE_ESTADO[s.estado]}`}>{s.estado}</span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1 max-w-2xl">{s.objetivo || "Sin objetivo definido."}</p>
                </div>
                <div className="text-right text-sm text-gray-400">
                  <p>{fecha(s.fecha_inicio)} → {fecha(s.fecha_fin)}</p>
                  <p className="text-xs text-gray-500">{hechas}/{delSprint.length} tarjetas hechas</p>
                </div>
              </div>

              {s.estado !== "cerrado" && <CapacidadSprint c={cap} pctClientesMeta={s.pct_clientes} />}

              {s.estado === "cerrado" && (s.retro_bien || s.retro_mal || s.retro_mejorar) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div><p className="kpi-etiqueta">Salió bien</p><p className="text-gray-300 whitespace-pre-wrap">{s.retro_bien || "—"}</p></div>
                  <div><p className="kpi-etiqueta">Salió mal</p><p className="text-gray-300 whitespace-pre-wrap">{s.retro_mal || "—"}</p></div>
                  <div><p className="kpi-etiqueta">Mejoramos</p><p className="text-gray-300 whitespace-pre-wrap">{s.retro_mejorar || "—"}</p></div>
                </div>
              )}

              {esGestor && <AccionesSprint id={s.id} estado={s.estado} />}
            </div>
          );
        })}
        {sprints.length === 0 && <div className="card p-8 text-center text-gray-500">Todavía no hay sprints.</div>}
      </section>

      <section className="space-y-3">
        <h2 className="font-display font-semibold text-lg">Definición de “Terminado”</h2>
        <div className="card p-4">
          <p className="text-sm text-gray-400 mb-2">
            Una tarjeta solo pasa a Hecho cuando se cumplen las cuatro condiciones. El sistema lo exige, no depende de la memoria de nadie.
          </p>
          <ol className="list-decimal pl-5 space-y-1 text-sm text-gray-300">
            {DOD.map((d) => (
              <li key={d.campo}>{d.label} <span className="text-gray-600">({d.quien})</span></li>
            ))}
          </ol>
          <p className="text-xs text-gray-500 mt-3">
            Regla de oro: nadie aprueba su propio trabajo. El revisor siempre es otra persona y solo el CTO cierra la tarjeta.
          </p>
        </div>
      </section>
    </div>
  );
}
