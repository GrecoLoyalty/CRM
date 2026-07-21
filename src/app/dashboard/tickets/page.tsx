import { createClient } from "@/lib/supabase/server";
import ListaTickets from "@/components/tickets/ListaTickets";

export default async function TicketsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: tickets }, { data: perfiles }, { data: clientes }] = await Promise.all([
    supabase
      .from("tickets")
      .select("*, creador:perfiles!creado_por(nombre_completo), asignado:perfiles!asignado_a(nombre_completo), cliente:clientes(nombre_empresa)")
      .order("created_at", { ascending: false }),
    supabase.from("perfiles").select("id, nombre_completo, color_calendario, role").eq("activo", true).order("nombre_completo"),
    supabase.from("clientes").select("id, nombre_empresa").neq("estado", "HISTORICO").order("nombre_empresa"),
  ]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold">Tickets</h1>
        <p className="text-gray-500 text-sm mt-1">
          Levanta un ticket para todo un departamento o para personas puntuales del equipo — con la opción de
          ligarlo a un cliente para darle contexto.
        </p>
      </div>

      <ListaTickets ticketsIniciales={(tickets || []) as any} perfiles={perfiles || []} clientes={clientes || []} userId={user!.id} />
    </div>
  );
}
