"use client";

import { useState } from "react";
import { definirMetas } from "@/app/dashboard/root/actions";

export default function PanelMetas({ metaActual }: { metaActual: any }) {
  const [guardando, setGuardando] = useState(false);
  const [edicionAbierta, setEdicionAbierta] = useState(false);

  async function onSubmit(formData: FormData) {
    setGuardando(true);
    try {
      await definirMetas(formData);
      setEdicionAbierta(false);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display font-semibold mb-1">Metas mensuales</h2>
          <p className="text-sm text-gray-500">Se propagan como barra de progreso global visible para todo el equipo.</p>
        </div>
        <button
          type="button"
          onClick={() => setEdicionAbierta((abierta) => !abierta)}
          aria-expanded={edicionAbierta}
          aria-controls="panel-metas-edicion"
          className="btn-secondary"
        >
          {edicionAbierta ? "Cerrar edición" : "Editar metas"}
        </button>
      </div>
      {edicionAbierta ? (
        <form id="panel-metas-edicion" action={onSubmit} className="mt-4 grid grid-cols-1 gap-3 border-t border-base-700 pt-4 md:grid-cols-4 md:items-end">
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
      ) : (
        <dl className="mt-4 grid grid-cols-1 gap-3 border-t border-base-700 pt-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-gray-500">Facturación objetivo</dt>
            <dd className="mt-1 text-sm text-gray-200">{metaActual?.facturacion_objetivo != null ? `$${Number(metaActual.facturacion_objetivo).toLocaleString("es-MX")}` : "Sin definir"}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Clientes nuevos objetivo</dt>
            <dd className="mt-1 text-sm text-gray-200">{metaActual?.clientes_nuevos_objetivo ?? "Sin definir"}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Reinicio mensual</dt>
            <dd className="mt-1 text-sm text-gray-200">{metaActual?.reseteo_automatico ?? true ? "Automático" : "Manual"}</dd>
          </div>
        </dl>
      )}
    </section>
  );
}
