import { createClient } from "@/lib/supabase/server";
import CalendarioCompartido from "@/components/calendario/CalendarioCompartido";

export default async function CalendarioPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: perfiles }, { data: clientes }] = await Promise.all([
    supabase
      .from("perfiles")
      .select("id, nombre_completo, color_calendario, role")
      .eq("activo", true)
      .order("nombre_completo"),
    supabase.from("clientes").select("id, nombre_empresa").neq("estado", "HISTORICO").order("nombre_empresa"),
  ]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold">Calendario</h1>
        <p className="text-gray-500 text-sm mt-1">
          Agenda compartida de todo el equipo. Cualquiera puede crear un evento e invitar a quien necesite — cada
          quien tiene su color para distinguirse de un vistazo.
        </p>
      </div>

      <CalendarioCompartido perfiles={perfiles || []} clientes={clientes || []} userId={user!.id} />
    </div>
  );
}
