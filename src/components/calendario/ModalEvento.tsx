"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { crearEvento, actualizarEvento } from "@/app/dashboard/calendario/actions";
import type { EventoCalendario, EventoInvitado } from "@/lib/types";

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

function aInputDatetime(iso: string) {
  return format(new Date(iso), "yyyy-MM-dd'T'HH:mm");
}

export default function ModalEvento({
  perfiles,
  clientes,
  userId,
  eventoExistente,
  invitadosExistentes,
  onCerrar,
  onGuardado,
}: {
  perfiles: PerfilLigero[];
  clientes: ClienteLigero[];
  userId: string;
  eventoExistente?: EventoCalendario;
  invitadosExistentes?: EventoInvitado[];
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const ahora = new Date();
  const enUnaHora = new Date(ahora.getTime() + 60 * 60 * 1000);

  const [titulo, setTitulo] = useState(eventoExistente?.titulo || "");
  const [descripcion, setDescripcion] = useState(eventoExistente?.descripcion || "");
  const [fechaInicio, setFechaInicio] = useState(eventoExistente ? aInputDatetime(eventoExistente.fecha_inicio) : format(ahora, "yyyy-MM-dd'T'HH:mm"));
  const [fechaFin, setFechaFin] = useState(eventoExistente ? aInputDatetime(eventoExistente.fecha_fin) : format(enUnaHora, "yyyy-MM-dd'T'HH:mm"));
  const [todoElDia, setTodoElDia] = useState(eventoExistente?.todo_el_dia || false);
  const [ubicacion, setUbicacion] = useState(eventoExistente?.ubicacion || "");
  const [clienteId, setClienteId] = useState(eventoExistente?.cliente_id || "");
  const [invitadosSel, setInvitadosSel] = useState<string[]>(
    invitadosExistentes ? invitadosExistentes.map((i) => i.perfil_id).filter((id) => id !== userId) : []
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function alternarInvitado(id: string) {
    setInvitadosSel((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function guardar() {
    setError(null);
    if (!titulo.trim()) return setError("Ponle un título al evento.");

    startTransition(async () => {
      try {
        const input = {
          titulo,
          descripcion,
          fechaInicio: new Date(fechaInicio).toISOString(),
          fechaFin: new Date(fechaFin).toISOString(),
          todoElDia,
          ubicacion,
          clienteId: clienteId || null,
          invitados: invitadosSel,
        };
        if (eventoExistente) {
          await actualizarEvento(eventoExistente.id, input);
        } else {
          await crearEvento(input);
        }
        onGuardado();
      } catch (e: any) {
        setError(e.message || "No se pudo guardar el evento.");
      }
    });
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onCerrar}>
      <div className="card w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-lg">{eventoExistente ? "Editar evento" : "Nuevo evento"}</h2>
          <button onClick={onCerrar} className="text-gray-500 hover:text-gray-300 text-xl leading-none">
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="label-field">Título</label>
            <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} className="input-field" placeholder="Ej. Reunión semanal de equipo" />
          </div>

          <div>
            <label className="label-field">Descripción (opcional)</label>
            <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={3} className="input-field" placeholder="Acerca de qué trata este evento" />
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="todo-el-dia" checked={todoElDia} onChange={(e) => setTodoElDia(e.target.checked)} />
            <label htmlFor="todo-el-dia" className="text-sm text-gray-300">
              Todo el día
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label-field">Inicia</label>
              <input type="datetime-local" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="label-field">Termina</label>
              <input type="datetime-local" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="input-field" />
            </div>
          </div>

          <div>
            <label className="label-field">Ubicación (opcional)</label>
            <input type="text" value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} className="input-field" placeholder="Oficina, link de videollamada, etc." />
          </div>

          <div>
            <label className="label-field">¿Relacionado a un cliente? (opcional)</label>
            <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="input-field">
              <option value="">— Ninguno —</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre_empresa}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label-field">Invitar a</label>
            <div className="max-h-40 overflow-y-auto space-y-1.5 bg-base-900 border border-base-600 rounded-lg p-3">
              {perfiles
                .filter((p) => p.id !== userId)
                .map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm text-gray-300">
                    <input type="checkbox" checked={invitadosSel.includes(p.id)} onChange={() => alternarInvitado(p.id)} />
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color_calendario || "#3AA7A1" }} />
                    {p.nombre_completo}
                  </label>
                ))}
            </div>
            <p className="text-xs text-gray-600 mt-1">Tú quedas invitado automáticamente como organizador.</p>
          </div>

          {error && <p className="text-sm text-signal-urgent">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button onClick={onCerrar} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button onClick={guardar} disabled={pending} className="btn-primary flex-1">
              {pending ? "Guardando…" : eventoExistente ? "Guardar cambios" : "Crear evento"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
