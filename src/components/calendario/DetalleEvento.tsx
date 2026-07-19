"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { eliminarEvento, responderInvitacion } from "@/app/dashboard/calendario/actions";
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

const RESPUESTA_LABEL: Record<string, string> = {
  pendiente: "Sin responder",
  acepta: "Confirmó",
  rechaza: "No asistirá",
};

const RESPUESTA_COLOR: Record<string, string> = {
  pendiente: "text-gray-500",
  acepta: "text-accent-soft",
  rechaza: "text-signal-urgent",
};

export default function DetalleEvento({
  evento,
  invitados,
  perfilesPorId,
  clientes,
  userId,
  onCerrar,
  onEditar,
  onEliminado,
}: {
  evento: EventoCalendario;
  invitados: EventoInvitado[];
  perfilesPorId: Map<string, PerfilLigero>;
  clientes: ClienteLigero[];
  userId: string;
  onCerrar: () => void;
  onEditar: () => void;
  onEliminado: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [copiado, setCopiado] = useState(false);
  const creador = perfilesPorId.get(evento.creado_por);
  const miPerfil = perfilesPorId.get(userId);
  const puedeEditar = evento.creado_por === userId || miPerfil?.role === "root" || miPerfil?.role === "ceo";
  const miInvitacion = invitados.find((i) => i.perfil_id === userId);
  const cliente = clientes.find((c) => c.id === evento.cliente_id);

  function copiarLinkInvitacion() {
    const url = `${window.location.origin}/evento/${evento.link_publico_token}`;
    navigator.clipboard.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  function eliminar() {
    if (!confirm("¿Eliminar este evento para todos los invitados?")) return;
    startTransition(async () => {
      await eliminarEvento(evento.id);
      onEliminado();
    });
  }

  function responder(respuesta: "acepta" | "rechaza") {
    startTransition(async () => {
      await responderInvitacion(evento.id, respuesta);
    });
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onCerrar}>
      <div className="card w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: creador?.color_calendario || "#3AA7A1" }} />
            <h2 className="font-display font-semibold text-lg">{evento.titulo}</h2>
          </div>
          <button onClick={onCerrar} className="text-gray-500 hover:text-gray-300 text-xl leading-none">
            ✕
          </button>
        </div>

        <p className="text-sm text-gray-400 mb-1">
          {evento.todo_el_dia
            ? format(new Date(evento.fecha_inicio), "EEEE d 'de' MMMM, yyyy", { locale: es })
            : `${format(new Date(evento.fecha_inicio), "EEEE d 'de' MMMM, h:mm a", { locale: es })} — ${format(new Date(evento.fecha_fin), "h:mm a", { locale: es })}`}
        </p>
        {evento.ubicacion && <p className="text-sm text-gray-400 mb-1">📍 {evento.ubicacion}</p>}
        {cliente && <p className="text-sm text-gray-400 mb-1">🏢 Relacionado a {cliente.nombre_empresa}</p>}
        <p className="text-xs text-gray-600 mb-4">Organiza {creador?.nombre_completo || "—"}</p>

        {evento.descripcion && (
          <div className="mb-4">
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Acerca de este evento</p>
            <p className="text-sm text-gray-300 whitespace-pre-wrap">{evento.descripcion}</p>
          </div>
        )}

        <div className="mb-4">
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Invitados ({invitados.length})</p>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {invitados.map((inv) => {
              const p = perfilesPorId.get(inv.perfil_id);
              return (
                <div key={inv.perfil_id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p?.color_calendario || "#3AA7A1" }} />
                    <span className="truncate">{p?.nombre_completo || "—"}</span>
                  </div>
                  <span className={`text-xs shrink-0 ml-2 ${RESPUESTA_COLOR[inv.respuesta]}`}>{RESPUESTA_LABEL[inv.respuesta]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {miInvitacion && miInvitacion.respuesta === "pendiente" && (
          <div className="flex gap-2 mb-4">
            <button onClick={() => responder("acepta")} disabled={pending} className="btn-primary flex-1 text-sm">
              Asistiré
            </button>
            <button onClick={() => responder("rechaza")} disabled={pending} className="btn-secondary flex-1 text-sm">
              No podré ir
            </button>
          </div>
        )}

        <div className="mb-4">
          <button onClick={copiarLinkInvitacion} className="w-full text-sm btn-secondary">
            {copiado ? "Link copiado ✓" : "🔗 Copiar link de invitación"}
          </button>
          <p className="text-xs text-gray-600 mt-1.5">
            Cualquiera con este link ve el detalle del evento (aunque no tenga cuenta), y le aparece un botón para
            entrar al sistema y confirmar su asistencia.
          </p>
        </div>

        {puedeEditar && (
          <div className="flex gap-2 border-t border-base-600 pt-4">
            <button onClick={onEditar} className="btn-secondary flex-1 text-sm">
              Editar
            </button>
            <button onClick={eliminar} disabled={pending} className="flex-1 text-sm rounded-lg border border-signal-urgent/40 text-signal-urgent hover:bg-signal-urgent/10 transition-colors py-2">
              Eliminar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
