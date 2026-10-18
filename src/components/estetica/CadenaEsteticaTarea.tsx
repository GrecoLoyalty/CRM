"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TareaBanner from "@/components/shared/TareaBanner";
import { actualizarEstadoTarea, eliminarTareaEstetica } from "@/app/dashboard/tareas-actions";

export default function CadenaEsteticaTarea({
  tarea,
  cliente,
  siguienteAccion,
  puedeEliminar = false,
}: {
  tarea: any;
  cliente: any;
  siguienteAccion?: { estado: string; label: string };
  puedeEliminar?: boolean;
}) {
  const router = useRouter();
  const [link, setLink] = useState(tarea.link_entregable || "");
  const [enviando, setEnviando] = useState(false);
  const [mostrarInput, setMostrarInput] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function eliminar() {
    if (!window.confirm(`¿Eliminar permanentemente la tarea "${tarea.titulo}"? Esta acción no se puede deshacer.`)) return;
    setEnviando(true);
    setError(null);
    try {
      const resultado = await eliminarTareaEstetica(tarea.id);
      if (resultado.error) {
        setError(resultado.error);
        return;
      }
      router.refresh();
    } catch (e: any) {
      setError(e.message || "No se pudo eliminar la tarea.");
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
      {puedeEliminar && (
        <div className="flex justify-end mt-1">
          <button onClick={eliminar} disabled={enviando} className="text-xs text-signal-urgent hover:underline disabled:opacity-50">
            {enviando ? "Eliminando..." : "Eliminar tarea"}
          </button>
        </div>
      )}
      {error && <p className="text-xs text-signal-urgent mt-1">{error}</p>}
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
