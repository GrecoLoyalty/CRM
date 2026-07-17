import { createClient } from "@/lib/supabase/server";
import FormularioCaptacion from "@/components/ventas/FormularioCaptacion";
import ListaProspectos from "@/components/ventas/ListaProspectos";

export default async function VentasPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: perfil } = await supabase.from("perfiles").select("role").eq("id", user!.id).single();
  const esLiderOVendedor = perfil?.role === "vendedor";

  let query = supabase
    .from("clientes")
    .select("*")
    .in("estado", ["PROSPECTO"])
    .order("created_at", { ascending: true });

  if (esLiderOVendedor) query = query.eq("vendedor_id", user!.id);

  const { data: prospectos } = await query;
  const { data: giros } = await supabase.from("giros_industria").select("*").eq("activo", true);

  // KPIs simples
  const { count: totalHistorico } = await supabase
    .from("clientes")
    .select("*", { count: "exact", head: true })
    .eq("vendedor_id", user!.id);
  const { count: cerrados } = await supabase
    .from("clientes")
    .select("*", { count: "exact", head: true })
    .eq("vendedor_id", user!.id)
    .neq("estado", "PROSPECTO");

  const tasaCierre = totalHistorico ? Math.round(((cerrados || 0) / totalHistorico) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-display font-semibold">Ventas</h1>
        <p className="text-gray-500 text-sm mt-1">Captación de prospectos y cierre de contratos.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="label-field">Tasa de cierre</p>
          <p className="text-3xl font-display font-semibold text-accent-soft">{tasaCierre}%</p>
        </div>
        <div className="card p-4">
          <p className="label-field">Prospectos en pipeline</p>
          <p className="text-3xl font-display font-semibold">{prospectos?.length || 0}</p>
        </div>
        <div className="card p-4">
          <p className="label-field">Clientes cerrados (histórico)</p>
          <p className="text-3xl font-display font-semibold">{cerrados || 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2">
          <FormularioCaptacion giros={giros || []} />
        </div>
        <div className="lg:col-span-3">
          <ListaProspectos prospectos={prospectos || []} />
        </div>
      </div>
    </div>
  );
}
