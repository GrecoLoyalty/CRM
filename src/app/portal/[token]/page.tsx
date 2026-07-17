import { createServiceClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ESTADO_COLOR } from "@/lib/types";
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

        <p className="text-center text-xs text-gray-600 mt-12">
          ¿Dudas sobre tu proyecto? Contacta a tu ejecutivo de cuenta en GRESANOVA.
        </p>
      </div>
    </main>
  );
}
