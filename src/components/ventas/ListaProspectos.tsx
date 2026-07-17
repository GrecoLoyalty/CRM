"use client";

import { useState } from "react";
import { cerrarGanado } from "@/app/dashboard/ventas/actions";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export default function ListaProspectos({ prospectos }: { prospectos: any[] }) {
  const [cerrandoId, setCerrandoId] = useState<string | null>(null);

  async function handleCerrar(id: string) {
    setCerrandoId(id);
    try {
      await cerrarGanado(id);
    } finally {
      setCerrandoId(null);
    }
  }

  if (prospectos.length === 0) {
    return (
      <div className="card p-8 text-center text-gray-500">
        Aún no hay prospectos en el pipeline. Registra el primero con el formulario.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="font-display font-semibold mb-2">Prospectos calientes</h2>
      <p className="text-xs text-gray-500 -mt-2 mb-3">Ordenados por antigüedad de último contacto — los más viejos son más urgentes.</p>
      {prospectos.map((p) => (
        <div key={p.id} className="card p-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium truncate">{p.nombre_empresa}</p>
              <span className="text-xs text-gray-500 font-mono">{p.cliente_codigo}</span>
            </div>
            <p className="text-sm text-gray-400">{p.nombre_contacto} · {p.telefono}</p>
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{p.necesidad_detectada}</p>
            <p className="text-xs text-gray-600 mt-2">
              Registrado {formatDistanceToNow(new Date(p.created_at), { addSuffix: true, locale: es })}
            </p>
          </div>
          <button
            onClick={() => handleCerrar(p.id)}
            disabled={cerrandoId === p.id}
            className="btn-primary shrink-0 text-sm whitespace-nowrap"
          >
            {cerrandoId === p.id ? "Cerrando..." : "Cerrado / Ganado"}
          </button>
        </div>
      ))}
    </div>
  );
}
