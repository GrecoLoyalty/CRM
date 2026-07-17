"use client";

import { useState } from "react";
import { definirMetas } from "@/app/dashboard/root/actions";

export default function PanelMetas({ metaActual }: { metaActual: any }) {
  const [guardando, setGuardando] = useState(false);

  async function onSubmit(formData: FormData) {
    setGuardando(true);
    try {
      await definirMetas(formData);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="card p-5">
      <h2 className="font-display font-semibold mb-1">Metas mensuales</h2>
      <p className="text-sm text-gray-500 mb-4">Se propaga como barra de progreso global visible para todo el equipo.</p>
      <form action={onSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <div>
          <label className="label-field">Facturación objetivo ($)</label>
          <input name="facturacion_objetivo" type="number" step="0.01" defaultValue={metaActual?.facturacion_objetivo} required className="input-field" />
        </div>
        <div>
          <label className="label-field">Clientes nuevos objetivo</label>
          <input name="clientes_nuevos_objetivo" type="number" defaultValue={metaActual?.clientes_nuevos_objetivo} required className="input-field" />
        </div>
        <label className="flex items-center gap-2 text-sm pb-2">
          <input type="checkbox" name="reseteo_automatico" defaultChecked={metaActual?.reseteo_automatico ?? true} className="accent-accent" />
          Resetear automáticamente cada mes
        </label>
        <button type="submit" disabled={guardando} className="btn-primary">
          {guardando ? "Guardando..." : "Guardar meta"}
        </button>
      </form>
    </section>
  );
}
