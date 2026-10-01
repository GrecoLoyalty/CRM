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
  const conexionPersonal = user ? await estadoConexionGoogle(user.id) : null;
  const conexionCentral = calendarioCompartido && calendarioCompartido.profileId !== user?.id
    ? await estadoConexionGoogle(calendarioCompartido.profileId)
    : null;

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-gray-50">Integraciones</h1>
        <p className="text-sm text-gray-500 mt-1">
          {calendarioCompartido
            ? "Los eventos compartidos del CRM llegan al calendario central. Conecta tu cuenta personal para sincronizar también tu agenda privada; el equipo no verá esos bloques en Google."
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
            <p className="font-medium text-gray-100">{calendarioCompartido ? "Tu Google Calendar personal" : "Google (Gmail + Calendar)"}</p>
            {conexionPersonal ? (
              <p className="text-sm text-gray-500 mt-0.5">
                Conectado como <span className="text-gray-300">{conexionPersonal.email_google}</span>
              </p>
            ) : (
              <p className="text-sm text-gray-500 mt-0.5">No conectado · requerido para sincronizar tu agenda personal</p>
            )}
          </div>
        </div>
        <BotonGoogle conectado={!!conexionPersonal} />
      </div>

      {calendarioCompartido && (
        <div className="border-l-2 border-accent/60 pl-4 py-1">
          <p className="text-sm font-medium text-gray-200">Calendario central del equipo</p>
          {calendarioCompartido.profileId === user?.id ? (
            <p className="text-xs text-gray-500 mt-1">Tu cuenta personal también es la cuenta autorizada para publicar eventos compartidos.</p>
          ) : (
            <p className="text-xs text-gray-500 mt-1">
              {conexionCentral
                ? `Conectado como ${conexionCentral.email_google}. La invitación general del equipo se gestiona en Google Calendar.`
                : "La cuenta central aún no está conectada."}
            </p>
          )}
        </div>
      )}

      <div className="text-xs text-gray-600 space-y-1">
        <p>Al conectar, autorizas dos permisos concretos de tu cuenta de Google:</p>
        <p>· Enviar correos en tu nombre (no leemos tu bandeja de entrada).</p>
        <p>· Crear, editar y borrar eventos en tu calendario personal desde la agenda personal del CRM.</p>
        {calendarioCompartido && <p>· Los eventos compartidos usan la cuenta central configurada para el equipo.</p>}
        <p>Puedes desconectar tu cuenta en cualquier momento desde aquí, o revocar el acceso directamente en tu cuenta de Google.</p>
      </div>
    </div>
  );
}
