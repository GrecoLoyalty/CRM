"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { actualizarRespuestaTarea } from "@/app/dashboard/tareas/respuesta-actions";
import { DEPTO_LABEL, RESPUESTA_TAREA_LABEL, RESPUESTA_TAREA_COLOR, type RespuestaTarea, type Depto } from "@/lib/types";

const SIGUIENTE: Record<RespuestaTarea, { siguiente: RespuestaTarea; label: string } | null> = {
  sin_responder: { siguiente: "visto", label: "Marcar como visto" },
  visto: { siguiente: "confirmado", label: "Confirmar" },
  confirmado: { siguiente: "en_proceso", label: "Poner en proceso" },
  en_proceso: { siguiente: "finalizado", label: "Finalizar (con link)" },
  finalizado: null,
};

export default function TareaManualCard({ tarea }: { tarea: any }) {
  const [respuesta, setRespuesta] = useState<RespuestaTarea>(tarea.respuesta_estado);
  const [comentario, setComentario] = useState("");
  const [link, setLink] = useState(tarea.link_entregable || "");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const siguientePaso = SIGUIENTE[respuesta];
  const requiereLink = siguientePaso?.siguiente === "finalizado";

  function avanzar() {
    if (!siguientePaso) return;
    setError(null);
    if (requiereLink && !link.trim()) return setError("Anexa el link del entregable para finalizar.");

    startTransition(async () => {
      try {
        await actualizarRespuestaTarea(tarea.id, siguientePaso.siguiente, { comentario, linkEntregable: link || undefined });
        setRespuesta(siguientePaso.siguiente);
        setComentario("");
        setMostrarFormulario(false);
      } catch (e: any) {
        setError(e.message || "No se pudo actualizar.");
      }
    });
  }

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full ${RESPUESTA_TAREA_COLOR[respuesta]}`}>{RESPUESTA_TAREA_LABEL[respuesta]}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-base-700 text-gray-400">{DEPTO_LABEL[tarea.depto as Depto]}</span>
            {tarea.cliente?.nombre_empresa && (
              <Link href={`/dashboard/cliente/${tarea.cliente.id}`} className="text-xs px-2 py-0.5 rounded-full bg-base-700 text-gray-400 hover:text-gray-200">
                🏢 {tarea.cliente.nombre_empresa}
              </Link>
            )}
          </div>
          <p className="font-medium">{tarea.titulo}</p>
          {tarea.descripcion && <p className="text-sm text-gray-400 mt-1 whitespace-pre-wrap">{tarea.descripcion}</p>}
          <p className="text-xs text-gray-600 mt-1">
            Asignada por {tarea.creador?.nombre_completo || "—"} · {format(new Date(tarea.created_at), "d MMM, h:mm a", { locale: es })}
            {tarea.fecha_pactada_entrega && ` · Entrega: ${format(new Date(tarea.fecha_pactada_entrega), "d MMM", { locale: es })}`}
          </p>
          {tarea.link_entregable && (
            <a href={tarea.link_entregable} target="_blank" rel="noopener noreferrer" className="text-xs text-accent-soft underline mt-1 inline-block">
              Ver entregable anexado
            </a>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-signal-urgent mt-2">{error}</p>}

      {siguientePaso && !mostrarFormulario && (
        <button onClick={() => setMostrarFormulario(true)} className="btn-primary text-sm mt-3">
          {siguientePaso.label}
        </button>
      )}

      {siguientePaso && mostrarFormulario && (
        <div className="mt-3 space-y-2 bg-base-900 border border-base-600 rounded-lg p-3">
          {requiereLink && (
            <input
              type="text"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="Link del entregable (Drive, WeTransfer, etc.)"
              className="input-field text-sm"
            />
          )}
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Comentario opcional para quien te la asignó"
            rows={2}
            className="input-field text-sm"
          />
          <div className="flex gap-2">
            <button onClick={() => setMostrarFormulario(false)} className="btn-secondary text-sm flex-1">
              Cancelar
            </button>
            <button onClick={avanzar} disabled={pending} className="btn-primary text-sm flex-1">
              {pending ? "Guardando…" : siguientePaso.label}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
