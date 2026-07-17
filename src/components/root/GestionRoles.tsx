"use client";

import { useState } from "react";
import { actualizarRol, alternarActivo, eliminarUsuario } from "@/app/dashboard/root/actions";
import type { Perfil } from "@/lib/types";

const ROLES = ["root", "ceo", "analista", "vendedor", "produccion"];
const DEPTOS = ["ventas", "analisis", "estetica", "desarrollo"];
const SUBROLES = ["camarografo", "editor", "community_manager", "fullstack", "ia_ml", "qa"];

export default function GestionRoles({ perfiles, currentUserId }: { perfiles: Perfil[]; currentUserId: string }) {
  const pendientes = perfiles.filter((p) => !p.activo);
  const activos = perfiles.filter((p) => p.activo);

  return (
    <>
      {pendientes.length > 0 && (
        <section className="card p-5 border-signal-warn/40">
          <h2 className="font-display font-semibold mb-1 flex items-center gap-2">
            Solicitudes pendientes
            <span className="text-xs bg-signal-warn/20 text-signal-warn px-2 py-0.5 rounded-full">{pendientes.length}</span>
          </h2>
          <p className="text-sm text-gray-500 mb-4">Asígnales un rol y depto real y apruébalas, o recházalas si no corresponden.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-gray-500 border-b border-base-600">
                  <th className="py-2 pr-4">Usuario</th>
                  <th className="py-2 pr-4">Nota de solicitud</th>
                  <th className="py-2 pr-4">Rol</th>
                  <th className="py-2 pr-4">Depto</th>
                  <th className="py-2 pr-4">Subrol</th>
                  <th className="py-2 pr-4">Acceso</th>
                  <th className="py-2 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {pendientes.map((p) => (
                  <FilaPerfil key={p.id} perfil={p} currentUserId={currentUserId} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="card p-5">
        <h2 className="font-display font-semibold mb-1">Roles y permisos (RBAC)</h2>
        <p className="text-sm text-gray-500 mb-4">Los roles viven en la base de datos — cámbialos aquí sin tocar código.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-gray-500 border-b border-base-600">
                <th className="py-2 pr-4">Usuario</th>
                <th className="py-2 pr-4">Rol</th>
                <th className="py-2 pr-4">Depto</th>
                <th className="py-2 pr-4">Subrol</th>
                <th className="py-2 pr-4">Activo</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {activos.map((p) => (
                <FilaPerfil key={p.id} perfil={p} currentUserId={currentUserId} />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function FilaPerfil({ perfil, currentUserId }: { perfil: Perfil; currentUserId: string }) {
  const [role, setRole] = useState(perfil.role);
  const [depto, setDepto] = useState(perfil.depto || "");
  const [subrol, setSubrol] = useState(perfil.subrol || "");
  const [activo, setActivo] = useState(perfil.activo);
  const [aprobando, setAprobando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [eliminado, setEliminado] = useState(false);
  const esUnoMismo = perfil.id === currentUserId;

  async function guardar(nuevoRole: string, nuevoDepto: string, nuevoSubrol: string) {
    setRole(nuevoRole as any);
    setDepto(nuevoDepto);
    setSubrol(nuevoSubrol);
    await actualizarRol(perfil.id, nuevoRole, nuevoDepto || null, nuevoSubrol || null);
  }

  async function aprobar() {
    setAprobando(true);
    try {
      setActivo(true);
      await alternarActivo(perfil.id, true);
    } finally {
      setAprobando(false);
    }
  }

  async function eliminar() {
    const mensaje = perfil.activo
      ? `¿Eliminar por completo la cuenta de "${perfil.nombre_completo}"? Esta acción no se puede deshacer.`
      : `¿Rechazar la solicitud de "${perfil.nombre_completo}"? Se eliminará su cuenta.`;
    if (!window.confirm(mensaje)) return;

    setEliminando(true);
    try {
      await eliminarUsuario(perfil.id);
      setEliminado(true);
    } catch (e: any) {
      alert(e.message || "No se pudo eliminar.");
      setEliminando(false);
    }
  }

  if (eliminado) return null;

  return (
    <tr className="border-b border-base-700">
      <td className="py-2 pr-4">{perfil.nombre_completo}</td>
      {!perfil.activo && <td className="py-2 pr-4 text-xs text-gray-500 max-w-[180px] truncate">{perfil.nota_solicitud || "—"}</td>}
      <td className="py-2 pr-4">
        <select value={role} onChange={(e) => guardar(e.target.value, depto, subrol)} className="input-field py-1">
          {ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </td>
      <td className="py-2 pr-4">
        <select value={depto} onChange={(e) => guardar(role, e.target.value, subrol)} className="input-field py-1">
          <option value="">—</option>
          {DEPTOS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </td>
      <td className="py-2 pr-4">
        <select value={subrol} onChange={(e) => guardar(role, depto, e.target.value)} className="input-field py-1">
          <option value="">—</option>
          {SUBROLES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </td>
      <td className="py-2 pr-4">
        {perfil.activo ? (
          <button
            onClick={async () => {
              setActivo(!activo);
              await alternarActivo(perfil.id, !activo);
            }}
            className={activo ? "text-green-400 text-xs" : "text-gray-500 text-xs"}
          >
            {activo ? "● Activo" : "○ Inactivo"}
          </button>
        ) : (
          <button onClick={aprobar} disabled={aprobando || activo} className="btn-primary text-xs px-3 py-1.5 whitespace-nowrap">
            {activo ? "✓ Aprobado" : aprobando ? "Aprobando..." : "Aprobar acceso"}
          </button>
        )}
      </td>
      <td className="py-2 pr-4">
        {esUnoMismo ? (
          <span className="text-xs text-gray-600">Tu cuenta</span>
        ) : (
          <button onClick={eliminar} disabled={eliminando} className="text-signal-urgent text-xs whitespace-nowrap hover:underline">
            {eliminando ? "Eliminando..." : perfil.activo ? "Eliminar" : "Rechazar"}
          </button>
        )}
      </td>
    </tr>
  );
}
