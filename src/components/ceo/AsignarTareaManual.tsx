"use client";

import { useMemo, useState, useTransition } from "react";
import { crearTareaManual } from "@/app/dashboard/ceo/tareas-actions";
import { DEPTO_LABEL, type Depto } from "@/lib/types";

interface PerfilOpcion {
  id: string;
  nombre_completo: string;
  subrol: string | null;
}

interface ClienteOpcion {
  id: string;
  nombre_empresa: string;
}

export default function AsignarTareaManual({
  perfiles,
  deptosPorPersona,
  clientes,
}: {
  perfiles: PerfilOpcion[];
  deptosPorPersona: Record<string, Depto[]>;
  clientes: ClienteOpcion[];
}) {
  const [asignadoA, setAsignadoA] = useState("");
  const [depto, setDepto] = useState<Depto | "">("");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [ligadaACliente, setLigadaACliente] = useState(false);
  const [clienteId, setClienteId] = useState("");
  const [fechaPactada, setFechaPactada] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const deptosDisponibles = useMemo(() => (asignadoA ? deptosPorPersona[asignadoA] || [] : []), [asignadoA, deptosPorPersona]);

  function onCambiarPersona(id: string) {
    setAsignadoA(id);
    const opciones = deptosPorPersona[id] || [];
    setDepto(opciones[0] || "");
  }

  function enviar() {
    setError(null);
    setOk(false);
    if (!asignadoA) return setError("Elige a quién se le asigna la tarea.");
    if (!depto) return setError("Elige el departamento de la tarea.");
    if (!titulo.trim()) return setError("Ponle un título a la tarea.");

    startTransition(async () => {
      try {
        await crearTareaManual({
          titulo,
          descripcion,
          asignadoA,
          depto: depto as Depto,
          clienteId: ligadaACliente ? clienteId || null : null,
          fechaPactadaEntrega: fechaPactada || null,
        });
        setTitulo("");
        setDescripcion("");
        setFechaPactada("");
        setLigadaACliente(false);
        setClienteId("");
        setOk(true);
        setTimeout(() => setOk(false), 2500);
      } catch (e: any) {
        setError(e.message || "No se pudo crear la tarea.");
      }
    });
  }

  return (
    <div className="card p-5 space-y-3">
      <div>
        <label className="label-field">Asignar a</label>
        <select value={asignadoA} onChange={(e) => onCambiarPersona(e.target.value)} className="input-field">
          <option value="">— Elige a la persona —</option>
          {perfiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre_completo}
              {p.subrol ? ` (${p.subrol})` : ""}
            </option>
          ))}
        </select>
      </div>

      {asignadoA && (
        <div>
          <label className="label-field">Departamento de la tarea</label>
          {deptosDisponibles.length === 0 ? (
            <p className="text-xs text-signal-warn">
              Esta persona no tiene un departamento asignado todavía (revisa Panel Root → Roles y permisos).
            </p>
          ) : (
            <select value={depto} onChange={(e) => setDepto(e.target.value as Depto)} className="input-field">
              {deptosDisponibles.map((d) => (
                <option key={d} value={d}>
                  {DEPTO_LABEL[d]}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <div>
        <label className="label-field">Título de la tarea</label>
        <input
          type="text"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ej. Actualizar catálogo de precios en el sitio"
          className="input-field"
        />
      </div>

      <div>
        <label className="label-field">Descripción (opcional)</label>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={3}
          placeholder="Detalles, contexto o instrucciones para quien la va a hacer"
          className="input-field"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="ligada-cliente"
          checked={ligadaACliente}
          onChange={(e) => setLigadaACliente(e.target.checked)}
        />
        <label htmlFor="ligada-cliente" className="text-sm text-gray-300">
          Esta tarea es extra, pero relacionada a un cliente puntual
        </label>
      </div>

      {ligadaACliente && (
        <div>
          <label className="label-field">Cliente</label>
          <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="input-field">
            <option value="">— Elige el cliente —</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre_empresa}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="label-field">Fecha pactada de entrega (opcional)</label>
        <input type="date" value={fechaPactada} onChange={(e) => setFechaPactada(e.target.value)} className="input-field" />
      </div>

      {error && <p className="text-sm text-signal-urgent">{error}</p>}
      {ok && <p className="text-sm text-accent-soft">Tarea asignada ✓</p>}

      <button onClick={enviar} disabled={pending} className="btn-primary w-full">
        {pending ? "Asignando…" : "Asignar tarea"}
      </button>
    </div>
  );
}
