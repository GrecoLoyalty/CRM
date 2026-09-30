import { createClient } from "@/lib/supabase/server";
import { estadoConexionGoogle } from "@/lib/google/tokens";
import { googleSharedCalendarConfig } from "@/lib/google/config";
import BotonGoogle from "@/components/integraciones/BotonGoogle";
import AvisoGoogle from "@/components/integraciones/AvisoGoogle";

export default async function IntegracionesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const calendarioCompartido = googleSharedCalendarConfig();
  const perfilGoogleId = calendarioCompartido?.profileId || user?.id;
  const conexion = perfilGoogleId ? await estadoConexionGoogle(perfilGoogleId) : null;
  const puedeConectarCuentaCentral = !calendarioCompartido || calendarioCompartido.profileId === user?.id;

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-gray-50">Integraciones</h1>
        <p className="text-sm text-gray-500 mt-1">
          {calendarioCompartido
            ? "Los eventos del CRM llegan a un calendario central de Google. La invitación general del equipo se administra manualmente desde Google Calendar."
            : "Conecta una cuenta de Google para reflejar allí los eventos del CRM. También puedes configurar un calendario central para todo el equipo."}
        </p>
      </div>

      <AvisoGoogle />

      <div className="card p-5 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-base-750 border border-base-600 flex items-center justify-center shrink-0 font-display font-bold text-accent">
            G
          </div>
          <div>
            <p className="font-medium text-gray-100">{calendarioCompartido ? "Google Calendar central" : "Google (Gmail + Calendar)"}</p>
            {conexion ? (
              <p className="text-sm text-gray-500 mt-0.5">
                Conectado como <span className="text-gray-300">{conexion.email_google}</span>
              </p>
            ) : (
              <p className="text-sm text-gray-500 mt-0.5">{calendarioCompartido ? "La cuenta central aún no está conectada" : "No conectado"}</p>
            )}
          </div>
        </div>
        {puedeConectarCuentaCentral && <BotonGoogle conectado={!!conexion} />}
      </div>

      <div className="text-xs text-gray-600 space-y-1">
        <p>Al conectar, autorizas dos permisos concretos de tu cuenta de Google:</p>
        <p>· Enviar correos en tu nombre (no leemos tu bandeja de entrada).</p>
        <p>· Crear, editar y borrar los eventos del CRM en el calendario configurado.</p>
        <p>Puedes desconectar tu cuenta en cualquier momento desde aquí, o revocar el acceso directamente en tu cuenta de Google.</p>
      </div>
    </div>
  );
}
