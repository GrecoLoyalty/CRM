import { createClient } from "@/lib/supabase/server";
import EmpresaReportes from "@/components/root/EmpresaReportes";

export default async function EmpresaPage() {
  const supabase = createClient();
  const desde = new Date();
  desde.setDate(1);
  desde.setMonth(desde.getMonth() - 11);
  const fechaDesde = `${desde.getFullYear()}-${String(desde.getMonth() + 1).padStart(2, "0")}-01`;

  const [{ data: configuracion }, { data: movimientos }] = await Promise.all([
    supabase.from("empresa_configuracion").select("*").eq("id", "principal").maybeSingle(),
    supabase.from("movimientos_caja").select("tipo, monto, fecha").gte("fecha", fechaDesde).order("fecha", { ascending: true }),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold">Empresa y reportes</h1>
        <p className="mt-1 text-sm text-gray-500">Perfil de la empresa y lectura financiera basada en los movimientos de caja registrados.</p>
      </header>
      <EmpresaReportes configuracion={configuracion} movimientos={movimientos || []} />
    </div>
  );
}