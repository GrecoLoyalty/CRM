"use client";

import { useState } from "react";
import TareaBanner from "@/components/shared/TareaBanner";
import { actualizarEstadoTarea } from "@/app/dashboard/tareas-actions";

export default function CadenaEsteticaTarea({ tarea, cliente, siguienteAccion }: { tarea: any; cliente: any; siguienteAccion?: { estado: string; label: string } }) {
  const [link, setLink] = useState(tarea.link_entregable || "");
  const [enviando, setEnviando] = useState(false);
  const [mostrarInput, setMostrarInput] = useState(false);

  async function confirmar() {
    if (!siguienteAccion) return;
    setEnviando(true);
    try {
      await actualizarEstadoTarea(tarea.id, siguienteAccion.estado as any, link, "/dashboard/estetica");
      setMostrarInput(false);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <TareaBanner
        tarea={tarea}
        cliente={cliente}
        onAvanzar={siguienteAccion ? () => setMostrarInput(true) : undefined}
        accionLabel={siguienteAccion?.label}
      />
      {mostrarInput && (
        <div className="card p-3 mt-1 flex gap-2 items-center">
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="Link del archivo (Drive, WeTransfer, etc.)"
            className="input-field flex-1 text-sm"
          />
          <button onClick={confirmar} disabled={enviando} className="btn-primary text-sm">
            {enviando ? "Guardando..." : "Confirmar"}
          </button>
        </div>
      )}
    </div>
  );
}
