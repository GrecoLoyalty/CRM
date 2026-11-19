import { createServiceClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ESTADO_COLOR, type Depto } from "@/lib/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import AgendaPortal, { type EventoPortal } from "@/components/portal/AgendaPortal";
import CarruselEquipoPortal from "@/components/portal/CarruselEquipoPortal";

// IMPORTANTE: esta página usa createServiceClient(), que es un cliente
// "plano" de supabase-js (no usa cookies() ni ninguna API dinámica de
// Next.js). Sin esto, Next.js la trata como una página ESTÁTICA y la
// cachea la primera vez que alguien abre el link — así que cualquier
// comentario, fecha o cambio de equipo que agregues DESPUÉS de esa
// primera visita nunca se reflejaba para el cliente. Forzamos
// renderizado dinámico para que siempre traiga los datos más recientes.
export const dynamic = "force-dynamic";
export const revalidate = 0;

const ETAPAS_ORDEN = ["PROSPECTO", "TRANSFERIDO", "EN_ANALISIS", "EN_PRODUCCION", "EN_SUPERVISION", "ENTREGADO"];
const ETAPA_LABEL: Record<string, string> = {
  PROSPECTO: "Contacto inicial",
  TRANSFERIDO: "Contrato firmado",
  EN_ANALISIS: "Análisis y estrategia",
  EN_PRODUCCION: "En producción",
  EN_SUPERVISION: "Revisión final",
  ENTREGADO: "Entregado",
};

const NIVEL_ESTILO: Record<string, string> = {
  informativo: "bg-signal-info/15 text-signal-info border-signal-info/30",
  importante: "bg-signal-warn/15 text-signal-warn border-signal-warn/30",
  urgente: "bg-signal-urgent/15 text-signal-urgent border-signal-urgent/30",
};
const NIVEL_LABEL: Record<string, string> = { informativo: "Aviso", importante: "Importante", urgente: "Urgente" };

export default async function PortalClientePage({ params }: { params: { token: string } }) {
  const supabase = createServiceClient();

  const { data: cliente } = await supabase
    .from("clientes")
    .select("*")
    .eq("portal_token", params.token)
    .single();

  if (!cliente) notFound();

  const { data: historial } = await supabase
    .from("clientes_etapas_historial")
    .select("*")
    .eq("cliente_id", cliente.id)
    .order("created_at", { ascending: true });

  // Equipo completo que atiende a este cliente (puede haber varias
  // personas por departamento). El portal solo expone nombre + depto +
  // avatar, nunca datos internos como email o rol exacto.
  // Nota: cliente_equipo tiene dos FKs hacia perfiles (perfil_id y
  // asignado_por), por eso el embed usa "!perfil_id" para desambiguar.
  const { data: equipoRaw } = await supabase
    .from("cliente_equipo")
    .select("depto, perfiles!perfil_id(nombre_completo, avatar_url)")
    .eq("cliente_id", cliente.id);

  // Avisos extra de este cliente, aparte del comentario de etapa —
  // descartamos los que ya expiraron sin tener que borrarlos a mano.
  const { data: avisosRaw } = await supabase
    .from("portal_avisos")
    .select("*")
    .eq("cliente_id", cliente.id)
    .eq("activo", true)
    .order("created_at", { ascending: false });

  const ahora = new Date();
  const avisos = (avisosRaw || []).filter((a) => !a.expira_at || new Date(a.expira_at) > ahora);

  // Materiales que Root/CEO/equipo subieron a la ficha y que están
  // marcados como visibles para el cliente (todo por defecto, salvo lo
  // que se oculte a propósito). Las fotos se muestran como miniatura; el
  // resto, como un enlace de descarga/visualización.
  const { data: materialesRaw } = await supabase
    .from("materiales_cliente")
    .select("id, storage_path, link_url, nombre_archivo, tipo_mime, created_at")
    .eq("cliente_id", cliente.id)
    .eq("visible_portal", true)
    .order("created_at", { ascending: false });

  const { data: eventosPortal } = await supabase
    .from("eventos_calendario")
    .select("id, titulo, descripcion, fecha_inicio, fecha_fin, todo_el_dia, ubicacion")
    .eq("cliente_id", cliente.id)
    .eq("visible_portal", true)
    .gte("fecha_fin", new Date().toISOString())
    .order("fecha_inicio", { ascending: true });

  const materiales = await Promise.all(
    (materialesRaw || []).map(async (m) => {
      let url = m.link_url;
      if (m.storage_path) {
        const { data } = await supabase.storage.from("materiales-cliente").createSignedUrl(m.storage_path, 3600);
        url = data?.signedUrl || null;
      }
      return { ...m, url, esImagen: m.tipo_mime?.startsWith("image/") };
    })
  );

  const DEPTOS_ORDEN: Depto[] = ["ventas", "analisis", "estetica", "desarrollo"];
  const equipo = DEPTOS_ORDEN.flatMap((depto) =>
    (equipoRaw || [])
      .filter((fila: any) => fila.depto === depto && fila.perfiles)
      .map((fila: any) => ({
        depto,
        ...(fila.perfiles as { nombre_completo: string; avatar_url: string | null }),
      }))
  );

  const indiceActual = ETAPAS_ORDEN.indexOf(cliente.estado);
  const historialPorEtapa = Object.fromEntries((historial || []).map((h) => [h.estado, h]));
  const etapasCompletadas = indiceActual < 0 ? 0 : indiceActual + 1;
  const porcentajeAvance = Math.round((etapasCompletadas / ETAPAS_ORDEN.length) * 100);
  const ultimoAvancePublico = [...(historial || [])].reverse().find((h) => h.comentario_publico?.trim());

  return (
    <main className="min-h-screen bg-base-900 text-gray-100 px-6 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center font-display font-bold text-base-900">G</div>
          <span className="font-display text-lg tracking-tight">GRESANOVA</span>
        </div>

        {avisos.length > 0 && (
          <div className="space-y-2 mb-6">
            {avisos.map((a) => (
              <div key={a.id} className={`border rounded-lg px-4 py-3 text-sm ${NIVEL_ESTILO[a.nivel]}`}>
                <span className="font-semibold uppercase text-xs tracking-wide mr-2">{NIVEL_LABEL[a.nivel]}</span>
                <span className="opacity-90">{a.mensaje}</span>
              </div>
            ))}
          </div>
        )}

        <div className="card p-6 sm:p-8 mb-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Seguimiento de proyecto</p>
              <h1 className="text-2xl font-display font-semibold mt-1">{cliente.nombre_empresa}</h1>
              <span className={`inline-block mt-3 text-xs px-3 py-1 rounded-full ${ESTADO_COLOR[cliente.estado as keyof typeof ESTADO_COLOR]}`}>
                {ETAPA_LABEL[cliente.estado] || cliente.estado}
              </span>
            </div>
            <div className="min-w-32 text-right">
              <p className="text-3xl font-display font-semibold tabular-nums">{porcentajeAvance}%</p>
              <p className="text-xs text-gray-500">{etapasCompletadas} de {ETAPAS_ORDEN.length} etapas</p>
            </div>
          </div>
          <div
            className="mt-6 h-2 rounded-full bg-base-600 overflow-hidden"
            role="progressbar"
            aria-label="Avance del proyecto"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={porcentajeAvance}
          >
            <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${porcentajeAvance}%` }} />
          </div>
          {ultimoAvancePublico && (
            <div className="mt-5 border-l-2 border-accent/70 pl-3">
              <p className="text-xs text-gray-500">
                Último avance · {format(new Date(ultimoAvancePublico.created_at), "d 'de' MMMM, yyyy", { locale: es })}
              </p>
              <p className="text-sm text-gray-200 mt-1">{ultimoAvancePublico.comentario_publico}</p>
            </div>
          )}
          {cliente.mostrar_ficha_portal && (
            <a
              href={`/api/portal/${params.token}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-4 text-xs px-3 py-1.5 rounded-lg bg-accent/15 text-accent-soft hover:bg-accent/25 transition-colors"
            >
              📄 Ver mi ficha completa
            </a>
          )}
        </div>

        <ol className="relative border-l border-base-600 ml-3 space-y-8">
          {ETAPAS_ORDEN.map((etapa, i) => {
            const alcanzada = i <= indiceActual;
            const dato = historialPorEtapa[etapa];
            return (
              <li key={etapa} className="ml-6">
                <span
                  className={`absolute -left-[9px] w-4 h-4 rounded-full border-2 ${
                    alcanzada ? "bg-accent border-accent" : "bg-base-800 border-base-600"
                  }`}
                />
                <p className={alcanzada ? "font-medium" : "text-gray-500"}>{ETAPA_LABEL[etapa]}</p>
                {dato?.fecha_estimada && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    Fecha estimada: {format(new Date(dato.fecha_estimada), "d 'de' MMMM, yyyy", { locale: es })}
                  </p>
                )}
                {dato?.comentario_publico && <p className="text-sm text-gray-400 mt-1">{dato.comentario_publico}</p>}
              </li>
            );
          })}
        </ol>

        <AgendaPortal eventos={(eventosPortal || []) as EventoPortal[]} />

        {equipo.length > 0 && <CarruselEquipoPortal miembros={equipo} />}

        {materiales.length > 0 && (
          <section className="card p-5 sm:p-6 mt-8" aria-labelledby="materiales-portal-heading">
            <div className="flex items-end justify-between gap-3 mb-5">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Archivos compartidos</p>
                <h2 id="materiales-portal-heading" className="font-display font-semibold text-lg mt-1">
                  Documentos de tu proyecto
                </h2>
              </div>
              <span className="text-xs text-gray-500 shrink-0">{materiales.length} {materiales.length === 1 ? "archivo" : "archivos"}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {materiales.map((m) => (
                <article key={m.id} className="group rounded-xl border border-base-600 bg-base-800/70 overflow-hidden hover:border-accent/50 transition-colors">
                  {m.esImagen && m.url ? (
                    <a href={m.url} target="_blank" rel="noopener noreferrer" className="block h-40 bg-base-900 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.url} alt={m.nombre_archivo} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                    </a>
                  ) : (
                    <div className="h-28 bg-gradient-to-br from-accent/10 via-base-800 to-base-900 flex items-center justify-center border-b border-base-700">
                      <div className="w-14 h-16 rounded-lg border border-base-500 bg-base-800 shadow-lg flex flex-col items-center justify-center gap-1">
                        <span className="text-2xl">{m.link_url && !m.storage_path ? "↗" : "▤"}</span>
                        <span className="text-[9px] font-semibold tracking-wide text-accent-soft">
                          {m.link_url && !m.storage_path ? "LINK" : m.nombre_archivo.split(".").pop()?.slice(0, 5).toUpperCase() || "ARCHIVO"}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="p-3.5">
                    <p className="text-sm font-medium text-gray-100 truncate" title={m.nombre_archivo}>
                      {m.nombre_archivo}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between gap-3">
                      <p className="text-xs text-gray-500">
                        {format(new Date(m.created_at), "d MMM yyyy", { locale: es })}
                      </p>
                      {m.url ? (
                        <a
                          href={m.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-accent-soft hover:text-accent transition-colors shrink-0"
                        >
                          Ver archivo ↗
                        </a>
                      ) : (
                        <span className="text-xs text-gray-600 shrink-0">No disponible</span>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <p className="text-center text-xs text-gray-600 mt-12">
          ¿Dudas sobre tu proyecto? Contacta a tu ejecutivo de cuenta en GRESANOVA.
        </p>
      </div>
    </main>
  );
}
