"use client";

import { asignarASprint, eliminarItem, reordenarItem } from "@/app/dashboard/scrum/actions";
import { useAccion } from "@/components/scrum/useAccion";
import { TIPO_ITEM_COLOR, TIPO_ITEM_LABEL } from "@/lib/scrum";
import type { ScrumItem, Sprint } from "@/lib/types";

export default function FilaBacklog({
  item,
  posicion,
  esGestor,
  sprintsAbiertos,
  esPrimero,
  esUltimo,
}: {
  item: ScrumItem;
  posicion: number;
  esGestor: boolean;
  sprintsAbiertos: Pick<Sprint, "id" | "nombre" | "estado">[];
  esPrimero: boolean;
  esUltimo: boolean;
}) {
  const { pendiente, error, ejecutar } = useAccion();

  return (
    <div className="card p-3 flex flex-col gap-2">
      <div className="flex items-start gap-3">
        <span className="text-xs text-gray-600 tabular-nums w-6 pt-0.5">{posicion}</span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{item.titulo}</p>
            <span className={`badge ${TIPO_ITEM_COLOR[item.tipo]}`}>{TIPO_ITEM_LABEL[item.tipo]}</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5">
            {item.cliente?.nombre_empresa || "GRESANOVA (interno)"}
            {item.epica ? ` · ${item.epica}` : ""}
            {item.horas_estimadas != null ? ` · ${item.horas_estimadas} h` : " · sin estimar"}
          </p>
          {item.criterios && <p className="text-xs text-gray-400 mt-1 whitespace-pre-wrap">{item.criterios}</p>}
        </div>
        {esGestor && (
          <div className="flex items-center gap-1 shrink-0">
            <button className="btn-icon !w-8 !h-8" title="Subir prioridad" disabled={pendiente || esPrimero} onClick={() => ejecutar(() => reordenarItem(item.id, "arriba"))}>
              ↑
            </button>
            <button className="btn-icon !w-8 !h-8" title="Bajar prioridad" disabled={pendiente || esUltimo} onClick={() => ejecutar(() => reordenarItem(item.id, "abajo"))}>
              ↓
            </button>
          </div>
        )}
      </div>

      {esGestor && (
        <div className="flex flex-wrap items-center gap-2 pl-9">
          <select
            className="input-field !w-auto"
            disabled={pendiente || sprintsAbiertos.length === 0}
            defaultValue=""
            onChange={(e) => e.target.value && ejecutar(() => asignarASprint(item.id, e.target.value))}
          >
            <option value="">{sprintsAbiertos.length ? "Mover a un sprint…" : "Crea un sprint primero"}</option>
            {sprintsAbiertos.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre} {s.estado === "activo" ? "(activo)" : ""}
              </option>
            ))}
          </select>
          <button
            className="btn-ghost !px-2 !py-1 text-xs text-signal-urgent"
            disabled={pendiente}
            onClick={() => confirm("¿Eliminar esta tarjeta del backlog?") && ejecutar(() => eliminarItem(item.id))}
          >
            Eliminar
          </button>
        </div>
      )}
      {error && <p className="text-xs text-signal-urgent pl-9">{error}</p>}
    </div>
  );
}
