"use client";

import { useState, useTransition } from "react";
import { crearTicket } from "@/app/dashboard/tickets/actions";
import { DEPTO_LABEL, type Depto, type PrioridadTicket } from "@/lib/types";

interface PerfilLigero {
  id: string;
  nombre_completo: string;
  color_calendario: string | null;
  role: string;
}

interface ClienteLigero {
  id: string;
  nombre_empresa: string;
}

const DEPTOS: Depto[] = ["ventas", "analisis", "estetica", "desarrollo"];
const PRIORIDADES: PrioridadTicket[] = ["baja", "media", "alta", "urgente"];

export default function ModalNuevoTicket({
  perfiles,
  clientes,
  onCerrar,
  onCreado,
}: {
  perfiles: PerfilLigero[];
  clientes: ClienteLigero[];
  onCerrar: () => void;
  onCreado: () => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [prioridad, setPrioridad] = useState<PrioridadTicket>("media");
  const [destinoTipo, setDestinoTipo] = useState<"depto" | "personas">("depto");
  const [depto, setDepto] = useState<Depto>("ventas");
  const [destinatarios, setDestinatarios] = useState<string[]>([]);
  const [ligadoACliente, setLigadoACliente] = useState(false);
  const [clienteId, setClienteId] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function alternarDestinatario(id: string) {
    setDestinatarios((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function enviar() {
    setError(null);
    if (!titulo.trim()) return setError("Ponle un título al ticket.");
    if (destinoTipo === "personas" && destinatarios.length === 0) {
      return setError("Elige al menos una persona.");
    }

    startTransition(async () => {
      try {
        await crearTicket({
          titulo,
          descripcion,
          prioridad,
          destinoTipo,
          depto: destinoTipo === "depto" ? depto : null,
          destinatarios: destinoTipo === "personas" ? destinatarios : [],
          clienteId: ligadoACliente ? clienteId || null : null,
        });
        onCreado();
      } catch (e: any) {
        setError(e.message || "No se pudo crear el ticket.");
      }
    });
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onCerrar}>
      <div className="card w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-lg">Nuevo ticket</h2>
          <button onClick={onCerrar} className="text-gray-500 hover:text-gray-300 text-xl leading-none">
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="label-field">Título</label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="input-field"
              placeholder="Ej. Falta información en el briefing del cliente X"
            />
          </div>

          <div>
            <label className="label-field">Descripción detallada</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={4}
              className="input-field"
              placeholder="Todo el contexto que la otra persona/depto necesita para atenderlo"
            />
          </div>

          <div>
            <label className="label-field">Prioridad</label>
            <select value={prioridad} onChange={(e) => setPrioridad(e.target.value as PrioridadTicket)} className="input-field">
              {PRIORIDADES.map((p) => (
                <option key={p} value={p}>
                  {p === "baja" ? "Baja" : p === "media" ? "Media" : p === "alta" ? "Alta" : "Urgente"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label-field">¿A quién va dirigido?</label>
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => setDestinoTipo("depto")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  destinoTipo === "depto" ? "bg-accent/20 text-accent-soft border border-accent/50" : "bg-base-900 border border-base-600 text-gray-400"
                }`}
              >
                Todo un departamento
              </button>
              <button
                onClick={() => setDestinoTipo("personas")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  destinoTipo === "personas" ? "bg-accent/20 text-accent-soft border border-accent/50" : "bg-base-900 border border-base-600 text-gray-400"
                }`}
              >
                Personas específicas
              </button>
            </div>

            {destinoTipo === "depto" ? (
              <select value={depto} onChange={(e) => setDepto(e.target.value as Depto)} className="input-field">
                {DEPTOS.map((d) => (
                  <option key={d} value={d}>
                    {DEPTO_LABEL[d]}
                  </option>
                ))}
              </select>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-1.5 bg-base-900 border border-base-600 rounded-lg p-3">
                {perfiles.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm text-gray-300">
                    <input type="checkbox" checked={destinatarios.includes(p.id)} onChange={() => alternarDestinatario(p.id)} />
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color_calendario || "#3AA7A1" }} />
                    {p.nombre_completo}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="ligado-cliente-ticket" checked={ligadoACliente} onChange={(e) => setLigadoACliente(e.target.checked)} />
            <label htmlFor="ligado-cliente-ticket" className="text-sm text-gray-300">
              Conectar este ticket con un cliente
            </label>
          </div>

          {ligadoACliente && (
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

          {error && <p className="text-sm text-signal-urgent">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button onClick={onCerrar} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button onClick={enviar} disabled={pending} className="btn-primary flex-1">
              {pending ? "Creando…" : "Crear ticket"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
