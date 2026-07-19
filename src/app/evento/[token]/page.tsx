import { createServiceClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";

// Igual que el portal del cliente: esta página usa createServiceClient
// (sin cookies() ni ninguna API dinámica de Next), así que SIEMPRE hay que
// forzar el renderizado dinámico — si no, Next la cachea de forma
// permanente desde la primera visita y nadie ve datos actualizados.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function InvitacionEventoPage({ params }: { params: { token: string } }) {
  const supabase = createServiceClient();

  const { data: evento } = await supabase
    .from("eventos_calendario")
    .select("*, organizador:perfiles!creado_por(nombre_completo, color_calendario)")
    .eq("link_publico_token", params.token)
    .single();

  if (!evento) notFound();

  const { data: invitadosRaw } = await supabase
    .from("evento_invitados")
    .select("respuesta, perfiles!perfil_id(nombre_completo, color_calendario)")
    .eq("evento_id", evento.id);

  const invitados = (invitadosRaw || []) as any[];

  return (
    <main className="min-h-screen bg-base-900 text-gray-100 px-6 py-12">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center font-display font-bold text-base-900">G</div>
          <span className="font-display text-lg tracking-tight">GRESANOVA</span>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: evento.organizador?.color_calendario || "#3AA7A1" }} />
            <p className="text-xs uppercase tracking-wide text-gray-500">Te invitaron a un evento</p>
          </div>
          <h1 className="text-2xl font-display font-semibold mt-1">{evento.titulo}</h1>

          <p className="text-sm text-gray-400 mt-3">
            {evento.todo_el_dia
              ? format(new Date(evento.fecha_inicio), "EEEE d 'de' MMMM, yyyy", { locale: es })
              : `${format(new Date(evento.fecha_inicio), "EEEE d 'de' MMMM, h:mm a", { locale: es })} — ${format(new Date(evento.fecha_fin), "h:mm a", { locale: es })}`}
          </p>
          {evento.ubicacion && <p className="text-sm text-gray-400 mt-1">📍 {evento.ubicacion}</p>}
          <p className="text-xs text-gray-600 mt-1">Organiza {evento.organizador?.nombre_completo || "—"}</p>

          {evento.descripcion && (
            <div className="mt-4">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Acerca de este evento</p>
              <p className="text-sm text-gray-300 whitespace-pre-wrap">{evento.descripcion}</p>
            </div>
          )}

          {invitados.length > 0 && (
            <div className="mt-5 border-t border-base-600 pt-4">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Invitados ({invitados.length})</p>
              <ul className="space-y-1.5">
                {invitados.map((inv, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-200">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: inv.perfiles?.color_calendario || "#3AA7A1" }} />
                    {inv.perfiles?.nombre_completo || "—"}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Link
            href={`/login?next=${encodeURIComponent("/dashboard/calendario")}`}
            className="btn-primary w-full text-center mt-6 block"
          >
            Entrar al sistema para confirmar asistencia
          </Link>
        </div>

        <p className="text-center text-xs text-gray-600 mt-8">
          Este link es solo una invitación de lectura — para confirmar tu asistencia necesitas tu cuenta de GRESANOVA OS.
        </p>
      </div>
    </main>
  );
}
