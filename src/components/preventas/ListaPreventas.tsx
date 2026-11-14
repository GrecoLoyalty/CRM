"use client";

import { useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  ESTADO_PREVENTA_COLOR,
  ESTADO_PREVENTA_LABEL,
  formatoMXN,
  type EstadoPreventa,
  type Preventa,
} from "@/lib/types";
import {
  actualizarPreventa,
  cambiarEstadoPreventa,
  confirmarPagoPreventa,
  revertirPagoPreventa,
} from "@/app/dashboard/preventas/actions";

type Filtro = "todas" | "pendientes" | "pagadas";

export default function ListaPreventas({
  preventas,
  puedeGestionar,
  esRoot,
  vendedores,
}: {
  preventas: Preventa[];
  puedeGestionar: boolean;
  esRoot: boolean;
  vendedores: Record<string, string>;
}) {
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [busqueda, setBusqueda] = useState("");
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return preventas.filter((p) => {
      if (filtro === "pendientes" && p.anticipo_pagado) return false;
      if (filtro === "pagadas" && !p.anticipo_pagado) return false;
      if (!q) return true;
      return [p.folio, p.nombre_cliente, p.nombre_negocio, p.telefono, p.email].some((v) => v.toLowerCase().includes(q));
    });
  }, [preventas, filtro, busqueda]);

  function ejecutar(fn: () => Promise<void>) {
    setError(null);
    iniciar(async () => {
      try {
        await fn();
      } catch (e: any) {
        setError(e?.message || "No se pudo completar la acción.");
      }
    });
  }

  async function copiar(p: Preventa) {
    const link = `${window.location.origin}/ticket/${p.ticket_token}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiadoId(p.id);
      setTimeout(() => setCopiadoId(null), 2000);
    } catch {
      window.prompt("Copia este enlace:", link);
    }
  }

  const FILTROS: { id: Filtro; label: string }[] = [
    { id: "todas", label: `Todas (${preventas.length})` },
    { id: "pendientes", label: `Sin pago (${preventas.filter((p) => !p.anticipo_pagado).length})` },
    { id: "pagadas", label: `Pagadas (${preventas.filter((p) => p.anticipo_pagado).length})` },
  ];

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="font-display font-semibold">Preventas</h2>
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por folio, nombre, negocio, teléfono..."
          aria-label="Buscar preventas"
          className="input-field sm:max-w-xs"
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="Filtrar por pago">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFiltro(f.id)}
            aria-pressed={filtro === f.id}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              filtro === f.id ? "border-accent bg-accent/15 text-accent-soft" : "border-base-600 text-gray-400 hover:border-base-500"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="mb-3 text-sm text-signal-urgent border border-signal-urgent/30 bg-signal-urgent/10 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {visibles.length === 0 ? (
        <p className="text-sm text-gray-500 py-6 text-center">No hay preventas para mostrar.</p>
      ) : (
        <ul className="divide-y divide-base-700">
          {visibles.map((p) => (
            <li key={p.id} className="py-4 space-y-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-gray-500">{p.folio}</span>
                    <span className="font-medium text-gray-100">{p.nombre_negocio}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${ESTADO_PREVENTA_COLOR[p.estado as EstadoPreventa]}`}>
                      {ESTADO_PREVENTA_LABEL[p.estado as EstadoPreventa]}
                    </span>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full ${
                        p.anticipo_pagado ? "bg-green-500/15 text-green-400" : "bg-signal-warn/15 text-signal-warn"
                      }`}
                    >
                      {p.anticipo_pagado ? "Anticipo pagado" : "Anticipo pendiente"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300">
                    {p.nombre_cliente} · <a href={`tel:${p.telefono}`} className="hover:text-accent-soft">{p.telefono}</a> · {p.email}
                  </p>
                  <p className="text-sm text-gray-500">{p.direccion}</p>
                  <p className="text-sm text-gray-400">
                    {p.cantidad} × {p.producto} · Total {formatoMXN(p.monto_total)} · Anticipo {formatoMXN(p.monto_anticipo)}
                  </p>
                  <p className="text-xs text-gray-600">
                    {format(new Date(p.created_at), "d MMM yyyy, HH:mm", { locale: es })}
                    {vendedores[p.vendedor_id] ? ` · Registró ${vendedores[p.vendedor_id]}` : ""}
                    {p.anticipo_pagado && p.pago_metodo ? ` · Pago en ${p.pago_metodo}` : ""}
                  </p>
                  {p.notas && <p className="text-xs text-gray-500">Nota: {p.notas}</p>}
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end shrink-0">
                  <button type="button" onClick={() => copiar(p)} className="btn-secondary text-xs">
                    {copiadoId === p.id ? "Copiado" : "Copiar ticket"}
                  </button>
                  <a href={`/ticket/${p.ticket_token}`} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs">
                    Ver ticket
                  </a>

                  {puedeGestionar && (
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setEditandoId(editandoId === p.id ? null : p.id);
                      }}
                      className="btn-secondary text-xs"
                    >
                      {editandoId === p.id ? "Cerrar edición" : "Editar información"}
                    </button>
                  )}

                  {puedeGestionar && !p.anticipo_pagado && (
                    <select
                      aria-label={`Confirmar pago de ${p.folio}`}
                      disabled={pendiente}
                      defaultValue=""
                      onChange={(e) => {
                        const metodo = e.target.value as "efectivo" | "transferencia" | "otro";
                        if (!metodo) return;
                        ejecutar(() => confirmarPagoPreventa(p.id, metodo));
                        e.target.value = "";
                      }}
                      className="input-field text-xs w-auto"
                    >
                      <option value="">Confirmar pago…</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="efectivo">Efectivo</option>
                      <option value="otro">Otro</option>
                    </select>
                  )}

                  {esRoot && p.anticipo_pagado && (
                    <button
                      type="button"
                      disabled={pendiente}
                      onClick={() => {
                        if (window.confirm(`¿Revertir el pago de ${p.folio}? Volverá a aparecer como pendiente para el cliente.`)) {
                          ejecutar(() => revertirPagoPreventa(p.id));
                        }
                      }}
                      className="btn-ghost text-xs"
                    >
                      Revertir pago
                    </button>
                  )}

                  {puedeGestionar && (
                    <select
                      aria-label={`Estado de ${p.folio}`}
                      disabled={pendiente}
                      value={p.estado}
                      onChange={(e) => ejecutar(() => cambiarEstadoPreventa(p.id, e.target.value))}
                      className="input-field text-xs w-auto"
                    >
                      {Object.entries(ESTADO_PREVENTA_LABEL).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {editandoId === p.id && puedeGestionar && (
                <form
                  action={(formData) =>
                    ejecutar(async () => {
                      await actualizarPreventa(p.id, formData);
                      setEditandoId(null);
                    })
                  }
                  className="grid grid-cols-1 gap-3 border-t border-base-700 pt-4 sm:grid-cols-2"
                >
                  <div>
                    <label className="label-field" htmlFor={`pv-edit-cliente-${p.id}`}>Nombre del cliente</label>
                    <input id={`pv-edit-cliente-${p.id}`} name="nombre_cliente" defaultValue={p.nombre_cliente} required className="input-field" />
                  </div>
                  <div>
                    <label className="label-field" htmlFor={`pv-edit-negocio-${p.id}`}>Negocio</label>
                    <input id={`pv-edit-negocio-${p.id}`} name="nombre_negocio" defaultValue={p.nombre_negocio} required className="input-field" />
                  </div>
                  <div>
                    <label className="label-field" htmlFor={`pv-edit-telefono-${p.id}`}>Teléfono</label>
                    <input id={`pv-edit-telefono-${p.id}`} name="telefono" type="tel" defaultValue={p.telefono} required className="input-field" />
                  </div>
                  <div>
                    <label className="label-field" htmlFor={`pv-edit-email-${p.id}`}>Correo electrónico</label>
                    <input id={`pv-edit-email-${p.id}`} name="email" type="email" defaultValue={p.email} required className="input-field" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label-field" htmlFor={`pv-edit-direccion-${p.id}`}>Dirección de entrega</label>
                    <textarea id={`pv-edit-direccion-${p.id}`} name="direccion" defaultValue={p.direccion} rows={2} required className="input-field" />
                  </div>
                  <div>
                    <label className="label-field" htmlFor={`pv-edit-producto-${p.id}`}>Producto</label>
                    <input id={`pv-edit-producto-${p.id}`} name="producto" defaultValue={p.producto} required className="input-field" />
                  </div>
                  <div>
                    <label className="label-field" htmlFor={`pv-edit-cantidad-${p.id}`}>Cantidad</label>
                    <input id={`pv-edit-cantidad-${p.id}`} name="cantidad" type="number" min={1} step={1} defaultValue={p.cantidad} required className="input-field" />
                  </div>
                  <div>
                    <label className="label-field" htmlFor={`pv-edit-total-${p.id}`}>Monto total</label>
                    <input id={`pv-edit-total-${p.id}`} name="monto_total" type="number" min={0} step="0.01" defaultValue={p.monto_total} required className="input-field" />
                  </div>
                  <div>
                    <label className="label-field" htmlFor={`pv-edit-anticipo-${p.id}`}>Monto del anticipo</label>
                    <input
                      id={`pv-edit-anticipo-${p.id}`}
                      name="monto_anticipo"
                      type="number"
                      min={0}
                      step="0.01"
                      defaultValue={p.monto_anticipo}
                      readOnly={p.anticipo_pagado}
                      required
                      className="input-field"
                    />
                    {p.anticipo_pagado && <p className="mt-1 text-xs text-gray-500">No se puede modificar un anticipo ya pagado.</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label-field" htmlFor={`pv-edit-notas-${p.id}`}>Notas</label>
                    <textarea id={`pv-edit-notas-${p.id}`} name="notas" defaultValue={p.notas || ""} rows={2} className="input-field" />
                  </div>
                  <div className="sm:col-span-2 flex flex-wrap gap-2">
                    <button type="submit" disabled={pendiente} className="btn-primary text-sm">
                      {pendiente ? "Guardando..." : "Guardar cambios"}
                    </button>
                    <button type="button" disabled={pendiente} onClick={() => setEditandoId(null)} className="btn-secondary text-sm">
                      Cancelar
                    </button>
                  </div>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
