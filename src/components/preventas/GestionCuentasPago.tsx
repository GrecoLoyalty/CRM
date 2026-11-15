"use client";

import { useState } from "react";
import type { PreventaCuenta } from "@/lib/types";
import { alternarCuentaPago, eliminarCuentaPago, guardarCuentaPago } from "@/app/dashboard/preventas/actions";

export default function GestionCuentasPago({ cuentas }: { cuentas: PreventaCuenta[] }) {
  const [editando, setEditando] = useState<PreventaCuenta | "nueva" | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function correr(fn: () => Promise<void>, alTerminar?: () => void) {
    setGuardando(true);
    setError(null);
    try {
      await fn();
      alTerminar?.();
    } catch (e: any) {
      setError(e?.message || "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  }

  const c = editando && editando !== "nueva" ? editando : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-gray-200">
          Cuentas de pago <span className="text-gray-500 font-normal">(el cliente las ve en un carrusel solo si aún no paga)</span>
        </h3>
        {!editando && (
          <button type="button" onClick={() => setEditando("nueva")} className="btn-secondary text-xs">
            Agregar cuenta
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-signal-urgent border border-signal-urgent/30 bg-signal-urgent/10 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {cuentas.length === 0 && !editando && (
        <p className="text-sm text-signal-warn">No hay cuentas: los clientes sin pago no verán a dónde depositar.</p>
      )}

      <ul className="divide-y divide-base-700 border-y border-base-700">
        {cuentas.map((x) => (
          <li key={x.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-gray-100">
                {x.etiqueta || x.banco} {!x.activa && <span className="text-xs text-gray-500">(oculta)</span>}
              </p>
              <p className="text-xs text-gray-500">{x.titular} · {x.clabe || x.numero_cuenta}</p>
            </div>
            <div className="flex gap-2">
              <button type="button" disabled={guardando} onClick={() => setEditando(x)} className="btn-ghost text-xs">Editar</button>
              <button type="button" disabled={guardando} onClick={() => correr(() => alternarCuentaPago(x.id, !x.activa))} className="btn-ghost text-xs">
                {x.activa ? "Ocultar" : "Mostrar"}
              </button>
              <button
                type="button"
                disabled={guardando}
                onClick={() => window.confirm(`¿Eliminar la cuenta ${x.banco}?`) && correr(() => eliminarCuentaPago(x.id))}
                className="btn-ghost text-xs"
              >
                Eliminar
              </button>
            </div>
          </li>
        ))}
      </ul>

      {editando && (
        <form
          key={c?.id || "nueva"}
          action={(fd) => correr(() => guardarCuentaPago(fd), () => setEditando(null))}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 border border-base-600 rounded-lg p-4"
        >
          <input type="hidden" name="id" value={c?.id || ""} />
          <div>
            <label className="label-field" htmlFor="cp-etiqueta">Etiqueta (opcional)</label>
            <input id="cp-etiqueta" name="etiqueta" defaultValue={c?.etiqueta || ""} placeholder="Ej: Transferencia BBVA" className="input-field" />
          </div>
          <div>
            <label className="label-field" htmlFor="cp-banco">Banco *</label>
            <input id="cp-banco" name="banco" required defaultValue={c?.banco || ""} className="input-field" />
          </div>
          <div className="sm:col-span-2">
            <label className="label-field" htmlFor="cp-titular">Nombre completo del titular *</label>
            <input id="cp-titular" name="titular" required defaultValue={c?.titular || ""} className="input-field" />
          </div>
          <div>
            <label className="label-field" htmlFor="cp-clabe">CLABE (18 dígitos)</label>
            <input id="cp-clabe" name="clabe" inputMode="numeric" maxLength={22} defaultValue={c?.clabe || ""} className="input-field font-mono" />
          </div>
          <div>
            <label className="label-field" htmlFor="cp-cuenta">Número de cuenta / tarjeta</label>
            <input id="cp-cuenta" name="numero_cuenta" defaultValue={c?.numero_cuenta || ""} className="input-field font-mono" />
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <button type="submit" disabled={guardando} className="btn-primary">{guardando ? "Guardando..." : "Guardar cuenta"}</button>
            <button type="button" onClick={() => setEditando(null)} className="btn-secondary">Cancelar</button>
          </div>
        </form>
      )}
    </div>
  );
}
