"use client";

import { useState } from "react";
import type { ScrumItem } from "@/lib/types";
import {
  ANTERIOR_ESTADO,
  DOD,
  SIGUIENTE_ESTADO,
  TIPO_ITEM_COLOR,
  TIPO_ITEM_LABEL,
} from "@/lib/scrum";
import { actualizarItem, aprobarItem, devolverItem, moverItem } from "@/app/dashboard/scrum/actions";
import { useAccion } from "@/components/scrum/useAccion";

export interface PersonaScrum {
  id: string;
  nombre: string;
}

export default function TarjetaScrum({
  item,
  personas,
  userId,
  esAprobador,
}: {
  item: ScrumItem;
  personas: PersonaScrum[];
  userId: string;
  esAprobador: boolean;
}) {
  const { pendiente, error, ejecutar } = useAccion();
  const [abierta, setAbierta] = useState(false);
  const [link, setLink] = useState(item.link_pr || "");
  const [doc, setDoc] = useState(item.documentacion || "");
  const [bloqueo, setBloqueo] = useState(item.bloqueo || "");

  const siguiente = SIGUIENTE_ESTADO[item.estado];
  const anterior = ANTERIOR_ESTADO[item.estado];
  const esRevisor = item.revisor_id === userId;
  const terminada = item.estado === "hecho";
  const faltan = DOD.filter((d) => !item[d.campo]).length;

  function guardarCampo(campos: Parameters<typeof actualizarItem>[1]) {
    ejecutar(() => actualizarItem(item.id, campos));
  }

  return (
    <div className={`card p-3 space-y-2 ${item.bloqueo ? "border-signal-urgent/50" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug">{item.titulo}</p>
        <span className={`badge ${TIPO_ITEM_COLOR[item.tipo]}`}>{TIPO_ITEM_LABEL[item.tipo]}</span>
      </div>

      <div className="flex flex-wrap gap-1.5 text-[11px] text-gray-500">
        <span>{item.cliente?.nombre_empresa || "GRESANOVA (interno)"}</span>
        {item.epica && <span>· {item.epica}</span>}
        {item.horas_estimadas != null && <span>· {item.horas_estimadas} h</span>}
      </div>

      {item.bloqueo && (
        <p className="text-xs text-signal-urgent">Bloqueada: {item.bloqueo}</p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label-field">Responsable</label>
          <select
            className="input-field"
            disabled={pendiente || terminada}
            value={item.responsable_id || ""}
            onChange={(e) => guardarCampo({ responsable_id: e.target.value || null })}
          >
            <option value="">Sin asignar</option>
            {personas.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label-field">Revisor</label>
          <select
            className="input-field"
            disabled={pendiente || terminada}
            value={item.revisor_id || ""}
            onChange={(e) => guardarCampo({ revisor_id: e.target.value || null })}
          >
            <option value="">Sin asignar</option>
            {personas
              .filter((p) => p.id !== item.responsable_id)
              .map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
          </select>
        </div>
      </div>

      {item.estado !== "por_hacer" && (
        <div className="rounded-lg bg-base-900/60 border border-base-700 p-2 space-y-1.5">
          <p className="label-field !mb-0">Terminado ({4 - faltan}/4)</p>
          {DOD.map((d) => {
            const puede =
              d.campo === "dod_aprobado"
                ? false
                : d.campo === "dod_pr_revisado"
                  ? esRevisor || esAprobador
                  : !terminada;
            return (
              <label key={d.campo} className="flex items-start gap-2 text-xs text-gray-300">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={item[d.campo]}
                  disabled={pendiente || !puede}
                  onChange={(e) =>
                    d.campo !== "dod_aprobado" && guardarCampo({ [d.campo]: e.target.checked })
                  }
                />
                <span>
                  {d.label} <span className="text-gray-600">· {d.quien}</span>
                </span>
              </label>
            );
          })}
        </div>
      )}

      <button type="button" className="text-[11px] text-accent-soft hover:underline" onClick={() => setAbierta(!abierta)}>
        {abierta ? "Ocultar detalle" : "Detalle, PR y documentación"}
      </button>

      {abierta && (
        <div className="space-y-2">
          {item.criterios && (
            <p className="text-xs text-gray-400 whitespace-pre-wrap">
              <span className="text-gray-500">Criterios: </span>
              {item.criterios}
            </p>
          )}
          <div>
            <label className="label-field">Link del pull request</label>
            <input
              className="input-field"
              value={link}
              disabled={terminada}
              placeholder="https://github.com/…/pull/…"
              onChange={(e) => setLink(e.target.value)}
              onBlur={() => link !== (item.link_pr || "") && guardarCampo({ link_pr: link.trim() || null })}
            />
          </div>
          <div>
            <label className="label-field">Documentación (3 líneas)</label>
            <textarea
              className="input-field"
              rows={3}
              value={doc}
              disabled={terminada}
              placeholder="Qué cambió y cómo se usa."
              onChange={(e) => setDoc(e.target.value)}
              onBlur={() => doc !== (item.documentacion || "") && guardarCampo({ documentacion: doc.trim() || null })}
            />
          </div>
          <div>
            <label className="label-field">Bloqueo</label>
            <input
              className="input-field"
              value={bloqueo}
              disabled={terminada}
              placeholder="Vacío si nada la detiene"
              onChange={(e) => setBloqueo(e.target.value)}
              onBlur={() => bloqueo !== (item.bloqueo || "") && guardarCampo({ bloqueo: bloqueo.trim() || null })}
            />
          </div>
        </div>
      )}

      {error && <p className="text-xs text-signal-urgent">{error}</p>}

      <div className="flex flex-wrap gap-2 pt-1">
        {anterior && (
          <button className="btn-ghost !px-2 !py-1 text-xs" disabled={pendiente} onClick={() => ejecutar(() => moverItem(item.id, anterior))}>
            ← Regresar
          </button>
        )}
        {siguiente && (
          <button className="btn-secondary !px-3 !py-1 text-xs" disabled={pendiente} onClick={() => ejecutar(() => moverItem(item.id, siguiente))}>
            {siguiente === "en_revision" ? "Pasar a revisión →" : "Empezar →"}
          </button>
        )}
        {item.estado === "en_revision" && esAprobador && (
          <>
            <button className="btn-primary !px-3 !py-1 text-xs" disabled={pendiente} onClick={() => ejecutar(() => aprobarItem(item.id))}>
              Aprobar y cerrar
            </button>
            <button className="btn-danger !px-3 !py-1 text-xs" disabled={pendiente} onClick={() => ejecutar(() => devolverItem(item.id))}>
              Devolver
            </button>
          </>
        )}
      </div>
    </div>
  );
}
