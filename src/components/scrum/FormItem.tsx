"use client";

import { useState } from "react";
import { crearItem } from "@/app/dashboard/scrum/actions";
import { useAccion } from "@/components/scrum/useAccion";
import { TIPO_ITEM_LABEL } from "@/lib/scrum";
import type { TipoScrumItem } from "@/lib/types";

export default function FormItem({
  clientes,
  sprintId,
}: {
  clientes: { id: string; nombre_empresa: string }[];
  sprintId?: string | null;
}) {
  const { pendiente, error, ejecutar } = useAccion();
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [criterios, setCriterios] = useState("");
  const [tipo, setTipo] = useState<TipoScrumItem>("historia");
  const [epica, setEpica] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [horas, setHoras] = useState("");

  function limpiar() {
    setTitulo("");
    setDescripcion("");
    setCriterios("");
    setEpica("");
    setHoras("");
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="label-field">Título</label>
        <input className="input-field" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej. Corregir permisos del CRM de cocoeco" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div>
          <label className="label-field">Tipo</label>
          <select className="input-field" value={tipo} onChange={(e) => setTipo(e.target.value as TipoScrumItem)}>
            {(Object.keys(TIPO_ITEM_LABEL) as TipoScrumItem[]).map((t) => (
              <option key={t} value={t}>{TIPO_ITEM_LABEL[t]}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label-field">Cliente (vacío = interno GRESANOVA)</label>
          <select className="input-field" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
            <option value="">GRESANOVA (interno)</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre_empresa}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label-field">Horas estimadas</label>
          <input className="input-field" type="number" min="0" step="0.5" value={horas} onChange={(e) => setHoras(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label-field">Épica o proyecto</label>
        <input className="input-field" value={epica} onChange={(e) => setEpica(e.target.value)} placeholder="CRM clientes, Chatbots, Estrategia, Web…" />
      </div>
      <div>
        <label className="label-field">Descripción</label>
        <textarea className="input-field" rows={2} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
      </div>
      <div>
        <label className="label-field">Criterios de aceptación</label>
        <textarea className="input-field" rows={2} value={criterios} onChange={(e) => setCriterios(e.target.value)} placeholder="¿Qué debe verse funcionando para darla por buena?" />
      </div>
      {error && <p className="text-sm text-signal-urgent">{error}</p>}
      <button
        className="btn-primary"
        disabled={pendiente || !titulo.trim()}
        onClick={() =>
          ejecutar(
            () =>
              crearItem({
                titulo,
                descripcion,
                criterios,
                tipo,
                epica,
                clienteId: clienteId || null,
                horasEstimadas: horas === "" ? null : Number(horas),
                sprintId: sprintId || null,
              }),
            limpiar
          )
        }
      >
        {pendiente ? "Guardando…" : "Agregar al backlog"}
      </button>
    </div>
  );
}
