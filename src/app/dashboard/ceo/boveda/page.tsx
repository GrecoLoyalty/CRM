import { createClient } from "@/lib/supabase/server";
import BovedaCliente from "@/components/root/BovedaCliente";

export default async function BovedaPage() {
  const supabase = createClient();
  const { data: clientes } = await supabase
    .from("clientes")
    .select("id, nombre_empresa, cliente_codigo")
    .order("nombre_empresa");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold">Bóveda de Contraseñas</h1>
        <p className="text-gray-500 text-sm mt-1">
          Acceso exclusivo Root y CEOs. Cifrado AES-256 (pgcrypto). Cada acceso queda registrado en el Audit Trail.
        </p>
      </div>
      <BovedaCliente clientes={clientes || []} />
    </div>
  );
}
