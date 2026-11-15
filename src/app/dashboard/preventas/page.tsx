import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FormularioPreventa from "@/components/preventas/FormularioPreventa";
import ListaPreventas from "@/components/preventas/ListaPreventas";
import PanelGlobalPreventas from "@/components/preventas/PanelGlobalPreventas";
import { formatoMXN, type Preventa, type PreventasConfig, type PreventaActualizacion, type PreventaCuenta } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PreventasPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase.from("perfiles").select("role").eq("id", user.id).single();
  const rol = perfil?.role as string | undefined;
  if (!rol || !["root", "ceo", "vendedor"].includes(rol)) redirect("/dashboard");

  const esRoot = rol === "root";
  const puedeGestionar = rol === "root" || rol === "ceo";

  // RLS ya limita al vendedor a sus propias preventas.
  const [{ data: preventasRaw }, { data: configRaw }, { data: actRaw }, { data: cuentasRaw }, { data: perfiles }] = await Promise.all([
    supabase.from("preventas").select("*").order("created_at", { ascending: false }),
    supabase.from("preventas_config").select("*").eq("id", "principal").single(),
    supabase.from("preventas_actualizaciones").select("*").order("created_at", { ascending: false }).limit(20),
    supabase.from("preventas_cuentas").select("*").order("orden", { ascending: true }),
    supabase.from("perfiles").select("id, nombre_completo"),
  ]);

  const preventas = (preventasRaw || []) as Preventa[];
  const config = configRaw as PreventasConfig | null;
  const cuentas = (cuentasRaw || []) as PreventaCuenta[];
  const actualizaciones = (actRaw || []) as PreventaActualizacion[];
  const vendedores = Object.fromEntries((perfiles || []).map((p) => [p.id, p.nombre_completo]));

  const activas = preventas.filter((p) => p.estado !== "cancelada");
  const pendientesPago = activas.filter((p) => !p.anticipo_pagado);
  const cobrado = activas.filter((p) => p.anticipo_pagado).reduce((s, p) => s + Number(p.monto_anticipo), 0);
  const porCobrar = pendientesPago.reduce((s, p) => s + Number(p.monto_anticipo), 0);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-display font-semibold">Preventas</h1>
        <p className="text-gray-500 text-sm mt-1">
          División de venta de productos: alta de clientes, anticipos y seguimiento por ticket.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="label-field">Preventas activas</p>
          <p className="text-3xl font-display font-semibold">{activas.length}</p>
        </div>
        <div className="card p-4">
          <p className="label-field">Sin anticipo</p>
          <p className="text-3xl font-display font-semibold text-signal-warn">{pendientesPago.length}</p>
        </div>
        <div className="card p-4">
          <p className="label-field">Anticipos cobrados</p>
          <p className="text-2xl font-display font-semibold text-accent-soft">{formatoMXN(cobrado)}</p>
        </div>
        <div className="card p-4">
          <p className="label-field">Anticipos por cobrar</p>
          <p className="text-2xl font-display font-semibold">{formatoMXN(porCobrar)}</p>
        </div>
      </div>

      {esRoot && config && <PanelGlobalPreventas config={config} cuentas={cuentas} actualizaciones={actualizaciones} />}

      <FormularioPreventa />

      <ListaPreventas
        preventas={preventas}
        puedeGestionar={puedeGestionar}
        esRoot={esRoot}
        vendedores={vendedores}
      />
    </div>
  );
}
