"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ESTADO_COLOR, DEPTO_LABEL, type EstadoCliente, type Depto } from "@/lib/types";
import { cambiarEtapaCliente, reasignarResponsables } from "@/app/dashboard/cliente/actions";
import { definirEquipoDepartamento } from "@/app/dashboard/cliente/equipo-actions";
import { reasignarTareaEncargado } from "@/app/dashboard/root/clientes/actions";

const DEPTOS: Depto[] = ["ventas", "analisis", "estetica", "desarrollo"];

interface PerfilOpcion {
  id: string;
  nombre_completo: string;
}

interface TareaResumen {
  id: string;
  titulo: string;
  estado: string;
  asignado_a: string | null;
}

interface ClienteResumen {
  id: string;
  nombre_empresa: string;
  nombre_contacto: string;
  estado: EstadoCliente;
  ruta_visual: boolean;
  ruta_software: boolean;
  vendedor: PerfilOpcion | null;
  analista: PerfilOpcion | null;
  equipoAsignado: Record<Depto, string[]>;
  tareasEstetica: TareaResumen[];
  tareasDesarrollo: TareaResumen[];
}

const PIPELINE: EstadoCliente[] = [
  "PROSPECTO",
  "TRANSFERIDO",
  "EN_ANALISIS",
  "EN_PRODUCCION",
  "EN_SUPERVISION",
  "ENTREGADO",
  "HISTORICO",
];

const ESTADO_LABEL: Record<EstadoCliente, string> = {
  PROSPECTO: "Prospecto",
  TRANSFERIDO: "Transferido",
  EN_ANALISIS: "En Análisis",
  EN_PRODUCCION: "En Producción",
  EN_SUPERVISION: "En Supervisión",
  ENTREGADO: "Entregado",
  HISTORICO: "Histórico",
};

export default function GestionClientesRoot({
  clientes,
  vendedores,
  analistas,
  equipoEstetica,
  equipoDesarrollo,
  equipoPorDepto,
}: {
  clientes: ClienteResumen[];
  vendedores: PerfilOpcion[];
  analistas: PerfilOpcion[];
  equipoEstetica: PerfilOpcion[];
  equipoDesarrollo: PerfilOpcion[];
  equipoPorDepto: Record<Depto, PerfilOpcion[]>;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("TODOS");

  const clientesFiltrados = useMemo(() => {
    return clientes.filter((c) => {
      if (filtroEstado !== "TODOS" && c.estado !== filtroEstado) return false;
      if (!busqueda.trim()) return true;
      const q = busqueda.toLowerCase();
      return c.nombre_empresa.toLowerCase().includes(q) || c.nombre_contacto.toLowerCase().includes(q);
    });
  }, [clientes, busqueda, filtroEstado]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          className="input-field sm:max-w-xs"
          placeholder="Buscar por empresa o contacto..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select className="input-field sm:max-w-xs" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
          <option value="TODOS">Todas las etapas</option>
          {PIPELINE.map((e) => (
            <option key={e} value={e}>
              {ESTADO_LABEL[e]}
            </option>
          ))}
        </select>
      </div>

      {clientesFiltrados.length === 0 && <p className="text-sm text-gray-500">No hay clientes que coincidan con el filtro.</p>}

      <div className="space-y-3">
        {clientesFiltrados.map((c) => (
          <TarjetaCliente
            key={c.id}
            cliente={c}
            vendedores={vendedores}
            analistas={analistas}
            equipoEstetica={equipoEstetica}
            equipoDesarrollo={equipoDesarrollo}
            equipoPorDepto={equipoPorDepto}
          />
        ))}
      </div>
    </div>
  );
}

function TarjetaCliente({
  cliente,
  vendedores,
  analistas,
  equipoEstetica,
  equipoDesarrollo,
  equipoPorDepto,
}: {
  cliente: ClienteResumen;
  vendedores: PerfilOpcion[];
  analistas: PerfilOpcion[];
  equipoEstetica: PerfilOpcion[];
  equipoDesarrollo: PerfilOpcion[];
  equipoPorDepto: Record<Depto, PerfilOpcion[]>;
}) {
  const [abierto, setAbierto] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [equipoAsignado, setEquipoAsignado] = useState<Record<Depto, string[]>>(cliente.equipoAsignado);

  function onAlternarMiembro(depto: Depto, perfilId: string) {
    const actuales = equipoAsignado[depto] || [];
    const nuevos = actuales.includes(perfilId) ? actuales.filter((id) => id !== perfilId) : [...actuales, perfilId];
    setEquipoAsignado((prev) => ({ ...prev, [depto]: nuevos }));
    setError(null);
    startTransition(async () => {
      try {
        await definirEquipoDepartamento(cliente.id, depto, nuevos);
      } catch (e: any) {
        setError(e.message || "No se pudo actualizar el equipo.");
        setEquipoAsignado((prev) => ({ ...prev, [depto]: actuales })); // revertir en caso de error
      }
    });
  }

  const idx = PIPELINE.indexOf(cliente.estado);

  function mover(nuevoIdx: number) {
    const destino = PIPELINE[nuevoIdx];
    if (!destino) return;
    setError(null);
    startTransition(async () => {
      try {
        await cambiarEtapaCliente(cliente.id, destino);
      } catch (e: any) {
        setError(e.message || "No se pudo actualizar la etapa.");
      }
    });
  }

  function onCambiarVendedor(vendedorId: string) {
    setError(null);
    startTransition(async () => {
      try {
        await reasignarResponsables(cliente.id, vendedorId || null, cliente.analista?.id || null);
      } catch (e: any) {
        setError(e.message || "No se pudo reasignar.");
      }
    });
  }

  function onCambiarAnalista(analistaId: string) {
    setError(null);
    startTransition(async () => {
      try {
        await reasignarResponsables(cliente.id, cliente.vendedor?.id || null, analistaId || null);
      } catch (e: any) {
        setError(e.message || "No se pudo reasignar.");
      }
    });
  }

  function onCambiarEncargadoTarea(tareaId: string, nuevoId: string) {
    setError(null);
    startTransition(async () => {
      try {
        await reasignarTareaEncargado(tareaId, nuevoId || null);
      } catch (e: any) {
        setError(e.message || "No se pudo reasignar la tarea.");
      }
    });
  }

  return (
    <div className="card overflow-hidden">
      <button onClick={() => setAbierto(!abierto)} className="w-full flex items-center justify-between gap-3 p-4 text-left">
        <div className="min-w-0">
          <p className="font-medium truncate">{cliente.nombre_empresa}</p>
          <p className="text-sm text-gray-500 truncate">{cliente.nombre_contacto}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_COLOR[cliente.estado]}`}>{ESTADO_LABEL[cliente.estado]}</span>
          <span className="text-gray-500 text-sm">{abierto ? "▲" : "▼"}</span>
        </div>
      </button>

      {abierto && (
        <div className="border-t border-base-600 p-4 sm:p-5 space-y-5">
          <Link href={`/dashboard/cliente/${cliente.id}`} className="text-xs text-accent-soft underline">
            Ver ficha completa →
          </Link>

          {/* Etapa: mantener / retroceder / avanzar */}
          <div>
            <p className="label-field">Etapa / departamento</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {PIPELINE.map((e, i) => (
                <span
                  key={e}
                  className={clsx(
                    "text-xs px-2 py-0.5 rounded-full border",
                    i === idx ? `${ESTADO_COLOR[e]} border-transparent font-medium` : "border-base-600 text-gray-600"
                  )}
                >
                  {ESTADO_LABEL[e]}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => mover(idx - 1)}
                disabled={pending || idx <= 0}
                className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ← Retroceder
              </button>
              <span className="text-xs text-gray-500">Mantener: no toques nada</span>
              <button
                onClick={() => mover(idx + 1)}
                disabled={pending || idx >= PIPELINE.length - 1}
                className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Avanzar →
              </button>
            </div>
          </div>

          {/* Encargados */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-field">Encargado de Ventas</label>
              <select className="input-field" defaultValue={cliente.vendedor?.id || ""} onChange={(e) => onCambiarVendedor(e.target.value)} disabled={pending}>
                <option value="">— sin asignar —</option>
                {vendedores.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nombre_completo}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-field">Encargado de Análisis</label>
              <select className="input-field" defaultValue={cliente.analista?.id || ""} onChange={(e) => onCambiarAnalista(e.target.value)} disabled={pending}>
                <option value="">— sin asignar —</option>
                {analistas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre_completo}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Equipo completo: varias personas por departamento para el mismo cliente */}
          <div>
            <p className="label-field">Equipo asignado (puede haber varias personas por departamento)</p>
            <p className="text-xs text-gray-500 mb-3">
              Marca a todas las personas de cada departamento que van a atender a este cliente. Esto es lo que el
              cliente ve en su portal.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {DEPTOS.map((depto) => (
                <div key={depto} className="bg-base-900 border border-base-600 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-300 mb-2">{DEPTO_LABEL[depto]}</p>
                  {equipoPorDepto[depto].length === 0 ? (
                    <p className="text-xs text-gray-600">Nadie pertenece aún a este departamento.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {equipoPorDepto[depto].map((p) => (
                        <label key={p.id} className="flex items-center gap-2 text-sm text-gray-300">
                          <input
                            type="checkbox"
                            checked={(equipoAsignado[depto] || []).includes(p.id)}
                            disabled={pending}
                            onChange={() => onAlternarMiembro(depto, p.id)}
                          />
                          {p.nombre_completo}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {cliente.ruta_visual && (
            <div>
              <p className="label-field">Tareas de Estética Visual</p>
              {cliente.tareasEstetica.length === 0 ? (
                <p className="text-sm text-gray-500">Aún no hay tareas creadas en este departamento.</p>
              ) : (
                <div className="space-y-2">
                  {cliente.tareasEstetica.map((t) => (
                    <div key={t.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 bg-base-900 border border-base-600 rounded-lg px-3 py-2">
                      <div className="flex-1 min-w-0 text-sm">
                        <span className="truncate block">{t.titulo}</span>
                        <span className="text-xs text-gray-500">{t.estado}</span>
                      </div>
                      <select
                        className="input-field sm:w-48"
                        defaultValue={t.asignado_a || ""}
                        onChange={(e) => onCambiarEncargadoTarea(t.id, e.target.value)}
                        disabled={pending}
                      >
                        <option value="">— sin asignar —</option>
                        {equipoEstetica.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nombre_completo}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {cliente.ruta_software && (
            <div>
              <p className="label-field">Tareas de Desarrollo</p>
              {cliente.tareasDesarrollo.length === 0 ? (
                <p className="text-sm text-gray-500">Aún no hay tareas creadas en este departamento.</p>
              ) : (
                <div className="space-y-2">
                  {cliente.tareasDesarrollo.map((t) => (
                    <div key={t.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 bg-base-900 border border-base-600 rounded-lg px-3 py-2">
                      <div className="flex-1 min-w-0 text-sm">
                        <span className="truncate block">{t.titulo}</span>
                        <span className="text-xs text-gray-500">{t.estado}</span>
                      </div>
                      <select
                        className="input-field sm:w-48"
                        defaultValue={t.asignado_a || ""}
                        onChange={(e) => onCambiarEncargadoTarea(t.id, e.target.value)}
                        disabled={pending}
                      >
                        <option value="">— sin asignar —</option>
                        {equipoDesarrollo.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nombre_completo}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && <p className="text-xs text-signal-urgent">{error}</p>}
        </div>
      )}
    </div>
  );
}
