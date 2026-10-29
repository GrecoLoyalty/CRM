"use client";

import { useState } from "react";
import { activarSprint, cerrarSprint, crearSprint } from "@/app/dashboard/scrum/actions";
import { useAccion } from "@/components/scrum/useAccion";

export function FormNuevoSprint() {
  const { pendiente, error, ejecutar } = useAccion();
  const [nombre, setNombre] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [inicio, setInicio] = useState("");
  const [fin, setFin] = useState("");
  const [colchon, setColchon] = useState(20);
  const [pctClientes, setPctClientes] = useState(60);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="label-field">Nombre</label>
          <input className="input-field" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Sprint 1" />
        </div>
        <div>
          <label className="label-field">Inicio</label>
          <input className="input-field" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
        </div>
        <div>
          <label className="label-field">Fin (2 semanas después)</label>
          <input className="input-field" type="date" value={fin} onChange={(e) => setFin(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label-field">Objetivo del sprint</label>
        <textarea className="input-field" rows={2} value={objetivo} onChange={(e) => setObjetivo(e.target.value)} placeholder="Una frase: qué estará funcionando al terminar." />
      </div>
      <div className="grid grid-cols-2 gap-3 max-w-md">
        <div>
          <label className="label-field">Colchón de urgencias (%)</label>
          <input className="input-field" type="number" min={0} max={100} value={colchon} onChange={(e) => setColchon(Number(e.target.value))} />
        </div>
        <div>
          <label className="label-field">Meta para clientes (%)</label>
          <input className="input-field" type="number" min={0} max={100} value={pctClientes} onChange={(e) => setPctClientes(Number(e.target.value))} />
        </div>
      </div>
      {error && <p className="text-sm text-signal-urgent">{error}</p>}
      <button
        className="btn-primary"
        disabled={pendiente}
        onClick={() =>
          ejecutar(
            () => crearSprint({ nombre, objetivo, fechaInicio: inicio, fechaFin: fin, colchonPct: colchon, pctClientes }),
            () => {
              setNombre("");
              setObjetivo("");
            }
          )
        }
      >
        Crear sprint
      </button>
    </div>
  );
}

export function AccionesSprint({ id, estado }: { id: string; estado: "planificado" | "activo" | "cerrado" }) {
  const { pendiente, error, ejecutar } = useAccion();
  const [cerrando, setCerrando] = useState(false);
  const [bien, setBien] = useState("");
  const [mal, setMal] = useState("");
  const [mejorar, setMejorar] = useState("");

  if (estado === "cerrado") return null;

  return (
    <div className="space-y-3">
      {estado === "planificado" && (
        <button className="btn-primary" disabled={pendiente} onClick={() => ejecutar(() => activarSprint(id))}>
          Activar sprint
        </button>
      )}
      {estado === "activo" && !cerrando && (
        <button className="btn-secondary" onClick={() => setCerrando(true)}>
          Cerrar sprint y hacer retrospectiva
        </button>
      )}
      {estado === "activo" && cerrando && (
        <div className="space-y-3 rounded-lg border border-base-600 p-3">
          <p className="text-xs text-gray-400">
            Lo que no quedó en "Hecho" regresa al backlog con su prioridad para decidirse en el siguiente Planning.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="label-field">Qué salió bien</label>
              <textarea className="input-field" rows={3} value={bien} onChange={(e) => setBien(e.target.value)} />
            </div>
            <div>
              <label className="label-field">Qué salió mal</label>
              <textarea className="input-field" rows={3} value={mal} onChange={(e) => setMal(e.target.value)} />
            </div>
            <div>
              <label className="label-field">Qué mejoramos</label>
              <textarea className="input-field" rows={3} value={mejorar} onChange={(e) => setMejorar(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn-primary" disabled={pendiente} onClick={() => ejecutar(() => cerrarSprint(id, { bien, mal, mejorar }), () => setCerrando(false))}>
              Confirmar cierre
            </button>
            <button className="btn-ghost" onClick={() => setCerrando(false)}>Cancelar</button>
          </div>
        </div>
      )}
      {error && <p className="text-sm text-signal-urgent">{error}</p>}
    </div>
  );
}
