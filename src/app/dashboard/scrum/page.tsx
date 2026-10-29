import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { createClient } from "@/lib/supabase/server";
import TarjetaScrum from "@/components/scrum/TarjetaScrum";
import DailyForm from "@/components/scrum/DailyForm";
import CapacidadSprint from "@/components/scrum/CapacidadSprint";
import { CEREMONIAS, COLUMNAS_TABLERO, calcularCapacidad, diasRestantes } from "@/lib/scrum";
import type { MiembroScrum, ScrumDaily, ScrumItem, Sprint } from "@/lib/types";

const fecha = (d: string) => format(new Date(`${d}T00:00:00`), "d 'de' MMM", { locale: es });

export default async function TableroScrumPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: perfil } = await supabase.from("perfiles").select("role").eq("id", user!.id).single();
  const esAprobador = perfil?.role === "root" || perfil?.role === "ceo";

  const { data: sprintData } = await supabase.from("sprints").select("*").eq("estado", "activo").maybeSingle();
  const sprint = sprintData as Sprint | null;

  if (!sprint) {
    return (
      <div className="card p-8 text-center space-y-3">
        <p className="text-gray-400">No hay un sprint activo.</p>
        <Link href="/dashboard/scrum/sprints" className="btn-primary inline-flex">
          Crear o activar un sprint
        </Link>
      </div>
    );
  }

  const hoy = new Date().toLocaleDateString("en-CA");
  const [{ data: itemsData }, { data: equipoData }, { data: dailiesData }] = await Promise.all([
    supabase
      .from("scrum_items")
      .select("*, cliente:clientes(nombre_empresa)")
      .eq("sprint_id", sprint.id)
      .order("orden", { ascending: true }),
    supabase.from("scrum_equipo").select("*, perfil:perfiles(nombre_completo)"),
    supabase
      .from("scrum_dailies")
      .select("*, perfil:perfiles(nombre_completo)")
      .eq("sprint_id", sprint.id)
      .eq("fecha", hoy),
  ]);

  const items = (itemsData || []) as ScrumItem[];
  const equipo = (equipoData || []) as MiembroScrum[];
  const dailies = (dailiesData || []) as ScrumDaily[];
  const miDaily = dailies.find((d) => d.perfil_id === user!.id) || null;
  const personas = equipo
    .filter((m) => m.rol_scrum !== "asesor")
    .map((m) => ({ id: m.perfil_id, nombre: m.perfil?.nombre_completo || "Sin nombre" }));

  const capacidad = calcularCapacidad(equipo, sprint, items);
  const bloqueadas = items.filter((i) => i.bloqueo && i.estado !== "hecho");
  const hechas = items.filter((i) => i.estado === "hecho").length;
  const pctAvance = items.length ? Math.round((hechas / items.length) * 100) : 0;

  return (
    <div className="space-y-8">
      <section className="card p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="kpi-etiqueta">Sprint activo</p>
            <h2 className="text-xl font-display font-semibold">{sprint.nombre}</h2>
            <p className="text-sm text-gray-400 mt-1 max-w-2xl">{sprint.objetivo || "Sin objetivo definido."}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-300">
              {fecha(sprint.fecha_inicio)} → {fecha(sprint.fecha_fin)}
            </p>
            <p className="text-xs text-gray-500">
              {diasRestantes(sprint)} día(s) restantes · {hechas}/{items.length} hechas ({pctAvance}%)
            </p>
          </div>
        </div>
        <CapacidadSprint c={capacidad} pctClientesMeta={sprint.pct_clientes} />
      </section>

      {bloqueadas.length > 0 && (
        <div className="banner-float banner-urgente">
          <p className="text-sm font-medium">Tarjetas bloqueadas ({bloqueadas.length})</p>
          <ul className="text-xs mt-1 space-y-0.5">
            {bloqueadas.map((b) => (
              <li key={b.id}>{b.titulo}: {b.bloqueo}</li>
            ))}
          </ul>
        </div>
      )}

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
        {COLUMNAS_TABLERO.map((col) => {
          const columna = items.filter((i) => i.estado === col.estado);
          return (
            <div key={col.estado} className="space-y-3">
              <h3 className="font-display font-semibold text-sm text-gray-400 uppercase tracking-wide">
                {col.label} <span className="text-gray-600">({columna.length})</span>
              </h3>
              {columna.map((item) => (
                <TarjetaScrum key={item.id} item={item} personas={personas} userId={user!.id} esAprobador={esAprobador} />
              ))}
              {columna.length === 0 && (
                <div className="rounded-xl border border-dashed border-base-600 p-4 text-center text-xs text-gray-600">
                  Vacío
                </div>
              )}
            </div>
          );
        })}
      </section>

      <section className="space-y-3">
        <h3 className="font-display font-semibold text-sm text-gray-400 uppercase tracking-wide">Daily de hoy</h3>
        <div className="card p-4">
          <DailyForm sprintId={sprint.id} inicial={miDaily} />
        </div>
        {dailies.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {dailies.map((d) => (
              <div key={d.id} className="card p-3 text-sm space-y-1">
                <p className="font-medium">{d.perfil?.nombre_completo}</p>
                {d.ayer && <p className="text-gray-400"><span className="text-gray-600">Hice: </span>{d.ayer}</p>}
                {d.hoy && <p className="text-gray-400"><span className="text-gray-600">Haré: </span>{d.hoy}</p>}
                {d.bloqueos && <p className="text-signal-urgent"><span className="opacity-70">Bloqueo: </span>{d.bloqueos}</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      <details className="card p-4">
        <summary className="cursor-pointer text-sm text-gray-300">Ceremonias del sprint</summary>
        <div className="overflow-x-auto mt-3">
          <table className="tabla">
            <thead>
              <tr><th>Ceremonia</th><th>Cuándo</th><th>Duración</th><th>Para qué</th></tr>
            </thead>
            <tbody>
              {CEREMONIAS.map((c) => (
                <tr key={c.nombre}>
                  <td className="font-medium">{c.nombre}</td>
                  <td>{c.cuando}</td>
                  <td>{c.duracion}</td>
                  <td>{c.para}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
