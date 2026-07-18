import { createServiceClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ESTADO_COLOR, DEPTO_LABEL, DEPTO_COLOR, type Depto } from "@/lib/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const ETAPAS_ORDEN = ["PROSPECTO", "TRANSFERIDO", "EN_ANALISIS", "EN_PRODUCCION", "EN_SUPERVISION", "ENTREGADO"];
const ETAPA_LABEL: Record<string, string> = {
  PROSPECTO: "Contacto inicial",
  TRANSFERIDO: "Contrato firmado",
  EN_ANALISIS: "Análisis y estrategia",
  EN_PRODUCCION: "En producción",
  EN_SUPERVISION: "Revisión final",
  ENTREGADO: "Entregado",
};

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

        <div className="card p-6 mb-8">
          <p className="text-xs uppercase tracking-wide text-gray-500">Estatus de tu proyecto</p>
          <h1 className="text-2xl font-display font-semibold mt-1">{cliente.nombre_empresa}</h1>
          <span className={`inline-block mt-3 text-xs px-3 py-1 rounded-full ${ESTADO_COLOR[cliente.estado as keyof typeof ESTADO_COLOR]}`}>
            {ETAPA_LABEL[cliente.estado] || cliente.estado}
          </span>
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

        <p className="text-center text-xs text-gray-600 mt-12">
          ¿Dudas sobre tu proyecto? Contacta a tu ejecutivo de cuenta en GRESANOVA.
        </p>
      </div>
    </main>
  );
}
