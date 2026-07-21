import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import DetalleTicket from "@/components/tickets/DetalleTicket";

export default async function TicketDetallePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: ticket } = await supabase
    .from("tickets")
    .select(
      "*, creador:perfiles!creado_por(id, nombre_completo), asignado:perfiles!asignado_a(id, nombre_completo), resolutor:perfiles!resuelto_por(nombre_completo), cliente:clientes(id, nombre_empresa)"
    )
    .eq("id", params.id)
    .single();

  if (!ticket) notFound(); // RLS ya filtra si no tiene acceso

  const [{ data: destinatariosRaw }, { data: comentariosRaw }, { data: perfiles }] = await Promise.all([
    supabase.from("ticket_destinatarios").select("perfil_id, perfiles!perfil_id(nombre_completo)").eq("ticket_id", ticket.id),
    supabase
      .from("ticket_comentarios")
      .select("*, autor:perfiles!autor_id(nombre_completo)")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: true }),
    supabase.from("perfiles").select("id, nombre_completo").eq("activo", true).order("nombre_completo"),
  ]);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Link href="/dashboard/tickets" className="text-sm text-gray-500 hover:text-gray-300">
        ← Volver a Tickets
      </Link>

      <DetalleTicket
        ticket={ticket as any}
        destinatarios={(destinatariosRaw || []) as any}
        comentariosIniciales={(comentariosRaw || []) as any}
        perfiles={perfiles || []}
        userId={user!.id}
      />
    </div>
  );
}
