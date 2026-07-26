import { createServiceClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ESTADO_COLOR, DEPTO_LABEL, DEPTO_COLOR, type Depto } from "@/lib/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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
  const equipoPorDepto = DEPTOS_ORDEN.map((depto) => ({
    depto,
    miembros: (equipoRaw || [])
      .filter((f: any) => f.depto === depto && f.perfiles)
      .map((f: any) => f.perfiles as { nombre_completo: string; avatar_url: string | null }),
  })).filter((grupo) => grupo.miembros.length > 0);

  const indiceActual = ETAPAS_ORDEN.indexOf(cliente.estado);
  const historialPorEtapa = Object.fromEntries((historial || []).map((h) => [h.estado, h]));

  return (
    <main className="min-h-screen bg-base-900 text-gray-100 px-6 py-12">
      <div className="max-w-2xl mx-auto">
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

        <div className="card p-6 mb-8">
          <p className="text-xs uppercase tracking-wide text-gray-500">Estatus de tu proyecto</p>
          <h1 className="text-2xl font-display font-semibold mt-1">{cliente.nombre_empresa}</h1>
          <span className={`inline-block mt-3 text-xs px-3 py-1 rounded-full ${ESTADO_COLOR[cliente.estado as keyof typeof ESTADO_COLOR]}`}>
            {ETAPA_LABEL[cliente.estado] || cliente.estado}
          </span>
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

        {equipoPorDepto.length > 0 && (
          <div className="card p-6 mt-8">
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-4">Tu equipo asignado</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {equipoPorDepto.map((grupo) => (
                <div key={grupo.depto}>
                  <span className={`inline-block text-[11px] px-2 py-0.5 rounded-full mb-2 ${DEPTO_COLOR[grupo.depto]}`}>
                    {DEPTO_LABEL[grupo.depto]}
                  </span>
                  <ul className="space-y-1.5">
                    {grupo.miembros.map((m, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-200">
                        {m.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.avatar_url} alt={m.nombre_completo} className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <span className="w-6 h-6 rounded-full bg-base-700 flex items-center justify-center text-[10px] text-gray-400">
                            {m.nombre_completo.charAt(0).toUpperCase()}
                          </span>
                        )}
                        {m.nombre_completo}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {materiales.length > 0 && (
          <div className="card p-6 mt-8">
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-4">Documentos y archivos de tu proyecto</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {materiales.map((m) => (
                <a
                  key={m.id}
                  href={m.url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-base-800 border border-base-600 rounded-lg overflow-hidden hover:border-accent/40 transition-colors block"
                >
                  <div className="aspect-square bg-base-700 flex items-center justify-center overflow-hidden">
                    {m.esImagen && m.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.url} alt={m.nombre_archivo} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl">{m.link_url && !m.storage_path ? "🔗" : "📄"}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-300 truncate px-2 py-1.5" title={m.nombre_archivo}>
                    {m.nombre_archivo}
                  </p>
                </a>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-gray-600 mt-12">
          ¿Dudas sobre tu proyecto? Contacta a tu ejecutivo de cuenta en GRESANOVA.
        </p>
      </div>
    </main>
  );
}
