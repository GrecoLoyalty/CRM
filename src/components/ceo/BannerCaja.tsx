"use client";

import { useState, useTransition } from "react";
import { registrarMovimientoCaja, eliminarMovimientoCaja } from "@/app/dashboard/ceo/finanzas-actions";
import { CATEGORIAS_INGRESO, CATEGORIAS_EGRESO, type MovimientoCaja, type TipoMovimientoCaja } from "@/lib/types";

const CATEGORIA_LABEL: Record<string, string> = {
  venta: "Venta",
  nomina: "Nómina",
  proveedor: "Proveedor",
  gasto_operativo: "Gasto operativo",
  impuestos: "Impuestos",
  otro: "Otro",
};

const formatoMoneda = (v: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(v);

export default function BannerCaja({ movimientosRecientes }: { movimientosRecientes: MovimientoCaja[] }) {
  const [tipo, setTipo] = useState<TipoMovimientoCaja>("ingreso");
  const [categoria, setCategoria] = useState("venta");
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const categorias = tipo === "ingreso" ? CATEGORIAS_INGRESO : CATEGORIAS_EGRESO;

  function onCambiarTipo(nuevoTipo: TipoMovimientoCaja) {
    setTipo(nuevoTipo);
    setCategoria(nuevoTipo === "ingreso" ? "venta" : "gasto_operativo");
  }

  function registrar() {
    setError(null);
    setOk(false);
    startTransition(async () => {
      try {
        await registrarMovimientoCaja({ tipo, categoria, concepto, monto: parseFloat(monto), fecha });
        setConcepto("");
        setMonto("");
        setOk(true);
        setTimeout(() => setOk(false), 2500);
      } catch (e: any) {
        setError(e.message || "No se pudo registrar el movimiento.");
      }
    });
  }

  function eliminar(id: string) {
    if (!confirm("¿Eliminar este movimiento? Esto afecta el flujo de caja y las ventas.")) return;
    startTransition(async () => {
      try {
        await eliminarMovimientoCaja(id);
      } catch (e: any) {
        setError(e.message || "No se pudo eliminar.");
      }
    });
  }

  return (
    <div className="card p-5">
      <h2 className="font-display font-semibold mb-1">Registrar ingreso / egreso</h2>
      <p className="text-sm text-gray-500 mb-4">
        Cada movimiento que captures aquí alimenta la gráfica de Ventas (si es un ingreso de categoría &quot;Venta&quot;)
        y la de Flujo de caja.
      </p>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => onCambiarTipo("ingreso")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            tipo === "ingreso" ? "bg-accent/20 text-accent-soft border border-accent/50" : "bg-base-900 border border-base-600 text-gray-400"
          }`}
        >
          + Ingreso
        </button>
        <button
          onClick={() => onCambiarTipo("egreso")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            tipo === "egreso" ? "bg-signal-urgent/20 text-signal-urgent border border-signal-urgent/50" : "bg-base-900 border border-base-600 text-gray-400"
          }`}
        >
          − Egreso
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label-field">Categoría</label>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="input-field">
            {categorias.map((c) => (
              <option key={c} value={c}>
                {CATEGORIA_LABEL[c] || c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label-field">Fecha</label>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="input-field" />
        </div>
        <div className="sm:col-span-2">
          <label className="label-field">Concepto</label>
          <input
            type="text"
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            placeholder={tipo === "ingreso" ? "Ej. Pago cliente XYZ — proyecto web" : "Ej. Renta oficina julio"}
            className="input-field"
          />
        </div>
        <div>
          <label className="label-field">Monto (MXN)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="0.00"
            className="input-field"
          />
        </div>
        <div className="flex items-end">
          <button onClick={registrar} disabled={pending || !concepto || !monto} className="btn-primary w-full">
            {pending ? "Guardando…" : "Registrar movimiento"}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-signal-urgent mt-3">{error}</p>}
      {ok && <p className="text-sm text-accent-soft mt-3">Movimiento registrado ✓</p>}

      {movimientosRecientes.length > 0 && (
        <div className="mt-5 border-t border-base-600 pt-4">
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Últimos movimientos</p>
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {movimientosRecientes.map((m) => (
              <div key={m.id} className="flex items-center justify-between text-sm bg-base-900 border border-base-600 rounded-lg px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate">{m.concepto}</p>
                  <p className="text-xs text-gray-500">
                    {m.fecha} · {CATEGORIA_LABEL[m.categoria] || m.categoria}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-2">
                  <span className={m.tipo === "ingreso" ? "text-accent-soft" : "text-signal-urgent"}>
                    {m.tipo === "ingreso" ? "+" : "−"}
                    {formatoMoneda(m.monto)}
                  </span>
                  <button onClick={() => eliminar(m.id)} className="text-gray-600 hover:text-signal-urgent" aria-label="Eliminar">
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
