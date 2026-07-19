"use client";

import { useState, useTransition } from "react";
import { reasignarResponsables } from "@/app/dashboard/cliente/actions";

interface PerfilOpcion {
  id: string;
  nombre_completo: string;
}

export default function ResponsablesCliente({
  clienteId,
  vendedor,
  analista,
  encargadosEstetica,
  encargadosDesarrollo,
  equipoPorDepto,
  puedeEditar,
  vendedores,
  analistas,
}: {
  clienteId: string;
  vendedor: PerfilOpcion | null;
  analista: PerfilOpcion | null;
  encargadosEstetica: string[];
  encargadosDesarrollo: string[];
  equipoPorDepto: Record<string, string[]>;
  puedeEditar: boolean;
  vendedores: PerfilOpcion[];
  analistas: PerfilOpcion[];
}) {
  const [editando, setEditando] = useState(false);
  const [vendedorId, setVendedorId] = useState(vendedor?.id || "");
  const [analistaId, setAnalistaId] = useState(analista?.id || "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function guardar() {
    setError(null);
    startTransition(async () => {
      try {
        await reasignarResponsables(clienteId, vendedorId || null, analistaId || null);
        setEditando(false);
      } catch (e: any) {
        setError(e.message || "No se pudo guardar.");
      }
    });
  }

  // El resto del equipo, sin contar al principal (para no repetir el nombre).
  const equipoExtra = (depto: string, principal?: string | null) =>
    (equipoPorDepto[depto] || []).filter((nombre) => nombre !== principal);

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-semibold text-sm text-gray-400 uppercase tracking-wide">Encargados</h2>
        {puedeEditar && !editando && (
          <button onClick={() => setEditando(true)} className="text-xs text-accent-soft hover:underline">
            Reasignar
          </button>
        )}
      </div>

      {!editando ? (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-gray-500 uppercase tracking-wide">Ventas</dt>
            <dd className="mt-0.5">
              {vendedor?.nombre_completo || "— sin asignar —"}
              {equipoExtra("ventas", vendedor?.nombre_completo).length > 0 && (
                <span className="text-gray-500"> + {equipoExtra("ventas", vendedor?.nombre_completo).join(", ")}</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 uppercase tracking-wide">Análisis</dt>
            <dd className="mt-0.5">
              {analista?.nombre_completo || "— sin asignar —"}
              {equipoExtra("analisis", analista?.nombre_completo).length > 0 && (
                <span className="text-gray-500"> + {equipoExtra("analisis", analista?.nombre_completo).join(", ")}</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 uppercase tracking-wide">Estética Visual</dt>
            <dd className="mt-0.5">{encargadosEstetica.length ? encargadosEstetica.join(", ") : equipoPorDepto.estetica?.join(", ") || "— sin tareas activas —"}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 uppercase tracking-wide">Desarrollo</dt>
            <dd className="mt-0.5">{encargadosDesarrollo.length ? encargadosDesarrollo.join(", ") : equipoPorDepto.desarrollo?.join(", ") || "— sin tareas activas —"}</dd>
          </div>
        </dl>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="label-field">Vendedor responsable</label>
            <select className="input-field" value={vendedorId} onChange={(e) => setVendedorId(e.target.value)}>
              <option value="">— sin asignar —</option>
              {vendedores.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nombre_completo}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-field">Analista responsable</label>
            <select className="input-field" value={analistaId} onChange={(e) => setAnalistaId(e.target.value)}>
              <option value="">— sin asignar —</option>
              {analistas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre_completo}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-gray-500">
            Aquí solo cambias al principal de Ventas/Análisis. Para agregar más personas al equipo (o los
            encargados de Estética/Desarrollo), ve a Panel Root → Clientes → &quot;Equipo asignado&quot;.
          </p>
          <div className="flex gap-2">
            <button onClick={guardar} disabled={pending} className="btn-primary text-xs px-3 py-1.5">
              {pending ? "Guardando..." : "Guardar"}
            </button>
            <button onClick={() => setEditando(false)} className="btn-secondary text-xs px-3 py-1.5">
              Cancelar
            </button>
          </div>
          {error && <p className="text-xs text-signal-urgent">{error}</p>}
        </div>
      )}
    </section>
  );
}
