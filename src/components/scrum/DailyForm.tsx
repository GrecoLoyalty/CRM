"use client";

import { useState } from "react";
import { guardarDaily } from "@/app/dashboard/scrum/actions";
import { useAccion } from "@/components/scrum/useAccion";

export default function DailyForm({
  sprintId,
  inicial,
}: {
  sprintId: string;
  inicial?: { ayer: string | null; hoy: string | null; bloqueos: string | null } | null;
}) {
  const { pendiente, error, ejecutar } = useAccion();
  const [ayer, setAyer] = useState(inicial?.ayer || "");
  const [hoy, setHoy] = useState(inicial?.hoy || "");
  const [bloqueos, setBloqueos] = useState(inicial?.bloqueos || "");
  const [guardado, setGuardado] = useState(false);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="label-field">¿Qué hice?</label>
          <textarea className="input-field" rows={3} value={ayer} onChange={(e) => { setAyer(e.target.value); setGuardado(false); }} />
        </div>
        <div>
          <label className="label-field">¿Qué haré hoy?</label>
          <textarea className="input-field" rows={3} value={hoy} onChange={(e) => { setHoy(e.target.value); setGuardado(false); }} />
        </div>
        <div>
          <label className="label-field">¿Qué me bloquea?</label>
          <textarea className="input-field" rows={3} value={bloqueos} onChange={(e) => { setBloqueos(e.target.value); setGuardado(false); }} />
        </div>
      </div>
      {error && <p className="text-sm text-signal-urgent">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          className="btn-secondary"
          disabled={pendiente}
          onClick={() => ejecutar(() => guardarDaily(sprintId, { ayer, hoy, bloqueos }), () => setGuardado(true))}
        >
          {pendiente ? "Guardando…" : "Guardar mi daily de hoy"}
        </button>
        {guardado && <span className="text-xs text-signal-ok">Guardado</span>}
      </div>
    </div>
  );
}
