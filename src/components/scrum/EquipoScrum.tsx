"use client";

import { useState } from "react";
import { guardarMiembro, quitarMiembro } from "@/app/dashboard/scrum/actions";
import { useAccion } from "@/components/scrum/useAccion";
import { ROL_SCRUM_LABEL } from "@/lib/scrum";
import type { MiembroScrum, RolScrum } from "@/lib/types";

export default function EquipoScrum({
  miembros,
  perfiles,
  puedeEditar,
}: {
  miembros: MiembroScrum[];
  perfiles: { id: string; nombre_completo: string }[];
  puedeEditar: boolean;
}) {
  const { pendiente, error, ejecutar } = useAccion();
  const [perfilId, setPerfilId] = useState("");
  const [rol, setRol] = useState<RolScrum>("desarrollo");
  const [horas, setHoras] = useState(12);
  const [factor, setFactor] = useState(1);

  const idsEnEquipo = new Set(miembros.map((m) => m.perfil_id));

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="tabla">
          <thead>
            <tr>
              <th>Persona</th>
              <th>Rol Scrum</th>
              <th>Horas por semana</th>
              <th>Dedicación a desarrollo</th>
              {puedeEditar && <th />}
            </tr>
          </thead>
          <tbody>
            {miembros.map((m) => (
              <tr key={m.perfil_id}>
                <td>{m.perfil?.nombre_completo || m.perfil_id}</td>
                <td>{ROL_SCRUM_LABEL[m.rol_scrum]}</td>
                <td className="tabular-nums">{m.horas_semana} h</td>
                <td className="tabular-nums">{Math.round(Number(m.factor_dedicacion) * 100)}%</td>
                {puedeEditar && (
                  <td>
                    <button className="btn-ghost !py-1 text-xs text-signal-urgent" disabled={pendiente} onClick={() => ejecutar(() => quitarMiembro(m.perfil_id))}>
                      Quitar
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {miembros.length === 0 && (
              <tr>
                <td colSpan={5} className="text-gray-500">Aún no hay equipo Scrum configurado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {puedeEditar && (
        <div className="space-y-3 rounded-lg border border-base-600 p-3">
          <p className="label-field !mb-0">Agregar o actualizar una persona</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <select className="input-field col-span-2 md:col-span-1" value={perfilId} onChange={(e) => setPerfilId(e.target.value)}>
              <option value="">Persona…</option>
              {perfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre_completo}
                  {idsEnEquipo.has(p.id) ? " (ya está)" : ""}
                </option>
              ))}
            </select>
            <select className="input-field" value={rol} onChange={(e) => setRol(e.target.value as RolScrum)}>
              {(Object.keys(ROL_SCRUM_LABEL) as RolScrum[]).map((r) => (
                <option key={r} value={r}>{ROL_SCRUM_LABEL[r]}</option>
              ))}
            </select>
            <input className="input-field" type="number" min={0} max={80} step={0.5} value={horas} onChange={(e) => setHoras(Number(e.target.value))} title="Horas por semana" />
            <input className="input-field" type="number" min={0.1} max={1} step={0.05} value={factor} onChange={(e) => setFactor(Number(e.target.value))} title="Fracción dedicada a desarrollo (1 = 100%)" />
          </div>
          {error && <p className="text-sm text-signal-urgent">{error}</p>}
          <button
            className="btn-secondary"
            disabled={pendiente || !perfilId}
            onClick={() => ejecutar(() => guardarMiembro({ perfilId, rol, horasSemana: horas, factor }))}
          >
            Guardar
          </button>
        </div>
      )}
    </div>
  );
}
