import { createClient } from "@/lib/supabase/server";
import ClienteAnalisisCard from "@/components/analisis/ClienteAnalisisCard";
import Link from "next/link";

export default async function AnalisisPage() {
  const supabase = createClient();
  const { data: clientes } = await supabase
    .from("clientes")
    .select("*")
    .in("estado", ["TRANSFERIDO", "EN_ANALISIS"])
    .order("created_at", { ascending: true });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold">Análisis &amp; Estrategia</h1>
        <p className="text-gray-500 text-sm mt-1">
          Nodo central del flujo. Un error aquí se multiplica en todos los departamentos siguientes.
        </p>
      </div>

      <Link href="/dashboard/marketing" className="card-link p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-accent-soft">Logística y estrategia de contenido</p>
          <h2 className="font-display font-semibold text-lg mt-1">Planeación de contenido por marca</h2>
          <p className="text-sm text-gray-500 mt-1">Gestiona marcas, guiones, calendario editorial y responsables de publicación.</p>
        </div>
        <span className="btn-secondary shrink-0">Abrir planeación</span>
      </Link>

      {(!clientes || clientes.length === 0) && (
        <div className="card p-8 text-center text-gray-500">No hay clientes esperando análisis por el momento.</div>
      )}

      <div className="space-y-4">
        {clientes?.map((c) => (
          <ClienteAnalisisCard key={c.id} cliente={c} />
        ))}
      </div>
    </div>
  );
}
