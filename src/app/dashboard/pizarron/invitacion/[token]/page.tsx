import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AceptarInvitacion from "@/components/pizarron/AceptarInvitacion";

export const dynamic = "force-dynamic";

export default async function InvitacionPizarronPage({ params }: { params: { token: string } }) {
  const supabase = createClient();
  const tokenValido = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.token);
  const { data: invitaciones, error } = tokenValido
    ? await supabase.rpc("fn_info_pizarron_invitacion", { p_token: params.token })
    : { data: [], error: null };
  if (error) {
    console.error("[pizarron] No se pudo verificar la invitación:", error.message);
  }
  const invitacion = invitaciones?.[0];

  return (
    <div className="mx-auto max-w-xl">
      <div className="card p-6">
        <p className="text-xs uppercase tracking-wide text-gray-500">Invitación a pizarrón</p>
        {invitacion ? (
          <>
            <h2 className="mt-2 text-xl font-display font-semibold">{invitacion.titulo}</h2>
            <p className="mt-2 text-sm text-gray-400">
              Podrás ver en tiempo real los cambios guardados y clonar este pizarrón para editar tu propia copia.
            </p>
            <AceptarInvitacion token={params.token} />
          </>
        ) : (
          <>
            <h2 className="mt-2 text-xl font-display font-semibold">Invitación no disponible</h2>
            <p className="mt-2 text-sm text-gray-400">
              Este enlace es inválido o fue revocado por quien lo creó.
            </p>
          </>
        )}
        <Link href="/dashboard/pizarron" className="mt-4 block text-center text-sm text-accent-soft hover:underline">
          Volver a mis pizarrones
        </Link>
      </div>
    </div>
  );
}
