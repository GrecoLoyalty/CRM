"use client";

import { useState, useTransition } from "react";
import { cambiarEtapaCliente } from "@/app/dashboard/cliente/actions";
import { ESTADO_COLOR, type EstadoCliente } from "@/lib/types";
import clsx from "clsx";

const PIPELINE: { estado: EstadoCliente; label: string }[] = [
  { estado: "PROSPECTO", label: "Prospecto" },
  { estado: "TRANSFERIDO", label: "Transferido" },
  { estado: "EN_ANALISIS", label: "En Análisis" },
  { estado: "EN_PRODUCCION", label: "En Producción" },
  { estado: "EN_SUPERVISION", label: "En Supervisión" },
  { estado: "ENTREGADO", label: "Entregado" },
  { estado: "HISTORICO", label: "Histórico" },
];

export default function ControlEtapaCliente({
  clienteId,
  estadoActual,
  puedeGestionar,
}: {
  clienteId: string;
  estadoActual: EstadoCliente;
  puedeGestionar: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const idx = PIPELINE.findIndex((p) => p.estado === estadoActual);

  function mover(nuevoIdx: number) {
    const destino = PIPELINE[nuevoIdx];
    if (!destino) return;
    setError(null);
    startTransition(async () => {
      try {
        await cambiarEtapaCliente(clienteId, destino.estado);
      } catch (e: any) {
        const msg = e.message || "";
        if (msg.includes("SALTO_NO_PERMITIDO")) setError("Solo puedes mover al cliente una etapa a la vez.");
        else if (msg.includes("SIN_PERMISO")) setError("No eres encargado de este cliente.");
        else setError("No se pudo actualizar la etapa.");
      }
    });
  }

  return (
    <section className="card p-5">
      <h2 className="font-display font-semibold text-sm text-gray-400 uppercase tracking-wide mb-3">Etapa / Departamento</h2>

      <div className="flex flex-wrap gap-1.5">
        {PIPELINE.map((p, i) => (
          <span
            key={p.estado}
            className={clsx(
              "text-xs px-2.5 py-1 rounded-full border whitespace-nowrap",
              i === idx ? `${ESTADO_COLOR[p.estado]} border-transparent font-medium` : "border-base-600 text-gray-600"
            )}
          >
            {p.label}
          </span>
        ))}
      </div>

      {puedeGestionar ? (
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <button
            onClick={() => mover(idx - 1)}
            disabled={pending || idx <= 0}
            className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Retroceder
          </button>
          <span className="text-xs text-gray-500">Mantener aquí: no hace falta hacer nada</span>
          <button
            onClick={() => mover(idx + 1)}
            disabled={pending || idx >= PIPELINE.length - 1}
            className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Avanzar →
          </button>
        </div>
      ) : (
        <p className="text-xs text-gray-500 mt-3">Solo Root/CEO o el equipo encargado de este cliente pueden mover su etapa.</p>
      )}

      {error && <p className="text-xs text-signal-urgent mt-2">{error}</p>}
    </section>
  );
}
