"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import { RESPUESTA_TAREA_LABEL, RESPUESTA_TAREA_COLOR, type RespuestaTarea } from "@/lib/types";

export default function SeguimientoTareasManuales({ tareas }: { tareas: any[] }) {
  const [abiertaId, setAbiertaId] = useState<string | null>(null);
  const [historialPorTarea, setHistorialPorTarea] = useState<Record<string, any[]>>({});
  const [cargando, setCargando] = useState<string | null>(null);

  async function alternar(tareaId: string) {
    if (abiertaId === tareaId) {
      setAbiertaId(null);
      return;
    }
    setAbiertaId(tareaId);
    if (!historialPorTarea[tareaId]) {
      setCargando(tareaId);
      const supabase = createClient();
      const { data } = await supabase
        .from("tarea_respuesta_historial")
        .select("*, perfiles!perfil_id(nombre_completo)")
        .eq("tarea_id", tareaId)
        .order("created_at", { ascending: true });
      setHistorialPorTarea((prev) => ({ ...prev, [tareaId]: data || [] }));
      setCargando(null);
    }
  }

  return (
    <div className="space-y-2">
      {tareas.map((t) => {
        const respuesta = (t.respuesta_estado || "sin_responder") as RespuestaTarea;
        const abierta = abiertaId === t.id;
        return (
          <div key={t.id} className="bg-base-900 border border-base-600 rounded-lg overflow-hidden">
            <button onClick={() => alternar(t.id)} className="w-full text-left px-3 py-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium text-sm">{t.titulo}</p>
                <p className="text-xs text-gray-500">
                  {t.perfiles?.nombre_completo || "—"} · {t.depto}
                  {t.clientes?.nombre_empresa ? ` · ${t.clientes.nombre_empresa}` : " · Interna (sin cliente)"}
                </p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${RESPUESTA_TAREA_COLOR[respuesta]}`}>
                {RESPUESTA_TAREA_LABEL[respuesta]}
              </span>
            </button>

            {abierta && (
              <div className="border-t border-base-600 px-3 py-3 space-y-3">
                {t.link_entregable && (
                  <a href={t.link_entregable} target="_blank" rel="noopener noreferrer" className="text-xs text-accent-soft underline block">
                    Ver entregable anexado
                  </a>
                )}

                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 mb-1.5">Historial de respuesta</p>
                  {cargando === t.id && <p className="text-xs text-gray-600">Cargando…</p>}
                  {historialPorTarea[t.id]?.length === 0 && <p className="text-xs text-gray-600">Todavía no ha respondido nada.</p>}
                  <div className="space-y-1.5">
                    {(historialPorTarea[t.id] || []).map((h: any) => (
                      <div key={h.id} className="text-xs bg-base-800 rounded-md px-2 py-1.5">
                        <div className="flex items-center justify-between">
                          <span className={`px-1.5 py-0.5 rounded-full ${RESPUESTA_TAREA_COLOR[h.respuesta_estado as RespuestaTarea]}`}>
                            {RESPUESTA_TAREA_LABEL[h.respuesta_estado as RespuestaTarea]}
                          </span>
                          <span className="text-gray-600">{format(new Date(h.created_at), "d MMM, h:mm a", { locale: es })}</span>
                        </div>
                        {h.comentario && <p className="text-gray-400 mt-1">{h.comentario}</p>}
                        {h.link_entregable && (
                          <a href={h.link_entregable} target="_blank" rel="noopener noreferrer" className="text-accent-soft underline block mt-1">
                            {h.link_entregable}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
