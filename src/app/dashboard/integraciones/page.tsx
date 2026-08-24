import { createClient } from "@/lib/supabase/server";
import { estadoConexionGoogle } from "@/lib/google/tokens";
import BotonGoogle from "@/components/integraciones/BotonGoogle";
import AvisoGoogle from "@/components/integraciones/AvisoGoogle";

export default async function IntegracionesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const conexion = user ? await estadoConexionGoogle(user.id) : null;

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-gray-50">Integraciones</h1>
        <p className="text-sm text-gray-500 mt-1">
          Conecta tu propia cuenta de Google para enviar correos desde tu Gmail y para que los
          eventos que crees en el calendario compartido se reflejen también en tu Google
          Calendar personal.
        </p>
      </div>

      <AvisoGoogle />

      <div className="card p-5 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-base-750 border border-base-600 flex items-center justify-center shrink-0 font-display font-bold text-accent">
            G
          </div>
          <div>
            <p className="font-medium text-gray-100">Google (Gmail + Calendar)</p>
            {conexion ? (
              <p className="text-sm text-gray-500 mt-0.5">
                Conectado como <span className="text-gray-300">{conexion.email_google}</span>
              </p>
            ) : (
              <p className="text-sm text-gray-500 mt-0.5">No conectado</p>
            )}
          </div>
        </div>
        <BotonGoogle conectado={!!conexion} />
      </div>

      <div className="text-xs text-gray-600 space-y-1">
        <p>Al conectar, autorizas dos permisos concretos de tu cuenta de Google:</p>
        <p>· Enviar correos en tu nombre (no leemos tu bandeja de entrada).</p>
        <p>· Crear, editar y borrar eventos en tu Google Calendar (solo los que tú generes desde este CRM).</p>
        <p>Puedes desconectar tu cuenta en cualquier momento desde aquí, o revocar el acceso directamente en tu cuenta de Google.</p>
      </div>
    </div>
  );
}
