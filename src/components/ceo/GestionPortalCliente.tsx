"use client";

import { useState } from "react";
import { fijarFechaEtapa } from "@/app/dashboard/ceo/actions";

export default function GestionPortalCliente({ clientes }: { clientes: any[] }) {
  const [clienteId, setClienteId] = useState("");
  const [fecha, setFecha] = useState("");
  const [comentario, setComentario] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const cliente = clientes.find((c) => c.id === clienteId);
  const portalUrl = cliente ? `${typeof window !== "undefined" ? window.location.origin : ""}/portal/${cliente.portal_token}` : "";

  async function guardar() {
    if (!clienteId) return;
    setGuardando(true);
    try {
      await fijarFechaEtapa(clienteId, cliente.estado, fecha, comentario);
      setFecha("");
      setComentario("");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="card p-5">
      <h2 className="font-display font-semibold mb-1">Portal del cliente</h2>
      <p className="text-sm text-gray-500 mb-4">
        Fija una fecha aproximada y un comentario público para la etapa actual del cliente. Se muestra en su link de estatus.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <div className="md:col-span-2">
          <label className="label-field">Cliente</label>
          <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="input-field">
            <option value="">Selecciona...</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre_empresa} — {c.estado}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label-field">Fecha aproximada</label>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="input-field" />
        </div>
        <button onClick={guardar} disabled={!clienteId || guardando} className="btn-primary">
          {guardando ? "Guardando..." : "Actualizar portal"}
        </button>
      </div>
      <div className="mt-3">
        <label className="label-field">Comentario público (visible para el cliente)</label>
        <input value={comentario} onChange={(e) => setComentario(e.target.value)} className="input-field" placeholder="Ej. Estamos grabando el contenido esta semana." />
      </div>

      {cliente && (
        <div className="mt-4 flex items-center gap-2 bg-base-900 border border-base-600 rounded-lg p-3">
          <code className="text-xs text-accent-soft break-all flex-1">{portalUrl}</code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(portalUrl);
              setCopiado(true);
              setTimeout(() => setCopiado(false), 1500);
            }}
            className="btn-secondary text-xs shrink-0"
          >
            {copiado ? "Copiado ✓" : "Copiar link"}
          </button>
        </div>
      )}
    </section>
  );
}
