"use client";

import { useState } from "react";
import { format } from "date-fns";

export default function TablaAuditoria({ registros, perfiles }: { registros: any[]; perfiles: any[] }) {
  const [filtroUsuario, setFiltroUsuario] = useState("");
  const [filtroAccion, setFiltroAccion] = useState("");

  const nombrePorId = Object.fromEntries(perfiles.map((p) => [p.id, p.nombre_completo]));

  const filtrados = registros.filter((r) => {
    if (filtroUsuario && r.usuario_id !== filtroUsuario) return false;
    if (filtroAccion && r.accion !== filtroAccion) return false;
    return true;
  });

  function exportarCSV() {
    const encabezados = ["ID", "Usuario", "Acción", "Objeto", "Objeto ID", "Timestamp"];
    const filas = filtrados.map((r) => [
      r.id_transaccion,
      nombrePorId[r.usuario_id] || r.usuario_id || "sistema",
      r.accion,
      r.objeto,
      r.objeto_id,
      r.timestamp,
    ]);
    const csv = [encabezados, ...filas].map((f) => f.map((c) => `"${c ?? ""}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit_trail_${Date.now()}.csv`;
    a.click();
  }

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="font-display font-semibold">Audit Trail</h2>
          <p className="text-sm text-gray-500">Registro inmutable. Solo INSERT — nunca se puede borrar.</p>
        </div>
        <div className="flex gap-2">
          <select value={filtroUsuario} onChange={(e) => setFiltroUsuario(e.target.value)} className="input-field py-1.5 text-sm">
            <option value="">Todos los usuarios</option>
            {perfiles.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre_completo}</option>
            ))}
          </select>
          <select value={filtroAccion} onChange={(e) => setFiltroAccion(e.target.value)} className="input-field py-1.5 text-sm">
            <option value="">Toda acción</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="LOGIN">LOGIN</option>
            <option value="EXPORT">EXPORT</option>
            <option value="VIEW_VAULT">VIEW_VAULT</option>
          </select>
          <button onClick={exportarCSV} className="btn-secondary text-sm">Exportar CSV</button>
        </div>
      </div>

      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-base-800">
            <tr className="text-left text-gray-500 border-b border-base-600">
              <th className="py-2 pr-4">Fecha</th>
              <th className="py-2 pr-4">Usuario</th>
              <th className="py-2 pr-4">Acción</th>
              <th className="py-2 pr-4">Objeto</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((r) => (
              <tr key={r.id_transaccion} className="border-b border-base-700 text-gray-300">
                <td className="py-2 pr-4 font-mono text-xs whitespace-nowrap">{format(new Date(r.timestamp), "dd/MM/yy HH:mm")}</td>
                <td className="py-2 pr-4">{nombrePorId[r.usuario_id] || "Sistema"}</td>
                <td className="py-2 pr-4">
                  <span className="text-xs px-2 py-0.5 rounded bg-base-600">{r.accion}</span>
                </td>
                <td className="py-2 pr-4 text-xs text-gray-500">{r.objeto} · {r.objeto_id?.slice(0, 8)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
