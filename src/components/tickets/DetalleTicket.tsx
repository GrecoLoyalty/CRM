"use client";

import { useEffect, useState, useTransition } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import { tomarTicket, cambiarEstadoTicket, comentarTicket } from "@/app/dashboard/tickets/actions";
import { PRIORIDAD_LABEL, PRIORIDAD_COLOR, ESTADO_TICKET_LABEL, ESTADO_TICKET_COLOR, DEPTO_LABEL, type Depto } from "@/lib/types";

export default function DetalleTicket({
  ticket,
  destinatarios,
  comentariosIniciales,
  perfiles,
  userId,
}: {
  ticket: any;
  destinatarios: any[];
  comentariosIniciales: any[];
  perfiles: { id: string; nombre_completo: string }[];
  userId: string;
}) {
  const [comentarios, setComentarios] = useState(comentariosIniciales);
  const [mensaje, setMensaje] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const canal = supabase
      .channel(`ticket-${ticket.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ticket_comentarios", filter: `ticket_id=eq.${ticket.id}` }, async () => {
        const { data } = await supabase
          .from("ticket_comentarios")
          .select("*, autor:perfiles!autor_id(nombre_completo)")
          .eq("ticket_id", ticket.id)
          .order("created_at", { ascending: true });
        if (data) setComentarios(data);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.id]);

  function accion(fn: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
      } catch (e: any) {
        setError(e.message || "Ocurrió un error.");
      }
    });
  }

  function enviarComentario() {
    if (!mensaje.trim()) return;
    accion(async () => {
      await comentarTicket(ticket.id, mensaje);
      setMensaje("");
    });
  }

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORIDAD_COLOR[ticket.prioridad as keyof typeof PRIORIDAD_COLOR]}`}>
            {PRIORIDAD_LABEL[ticket.prioridad as keyof typeof PRIORIDAD_LABEL]}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_TICKET_COLOR[ticket.estado as keyof typeof ESTADO_TICKET_COLOR]}`}>
            {ESTADO_TICKET_LABEL[ticket.estado as keyof typeof ESTADO_TICKET_LABEL]}
          </span>
          {ticket.depto_destino && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-base-700 text-gray-400">
              Para: {DEPTO_LABEL[ticket.depto_destino as Depto]}
            </span>
          )}
        </div>

        <h1 className="text-xl font-display font-semibold">{ticket.titulo}</h1>
        <p className="text-xs text-gray-500 mt-1">
          Creado por {ticket.creador?.nombre_completo || "—"} · {format(new Date(ticket.created_at), "d MMM yyyy, h:mm a", { locale: es })}
        </p>

        {ticket.cliente?.nombre_empresa && (
          <p className="text-sm text-gray-400 mt-2">🏢 Relacionado a {ticket.cliente.nombre_empresa}</p>
        )}

        {ticket.descripcion && <p className="text-sm text-gray-300 mt-3 whitespace-pre-wrap">{ticket.descripcion}</p>}

        {destinatarios.length > 0 && (
          <div className="mt-4">
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Dirigido a</p>
            <p className="text-sm text-gray-300">{destinatarios.map((d) => d.perfiles?.nombre_completo).join(", ")}</p>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-base-600">
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Trabajando en esto</p>
          <p className="text-sm text-gray-300">{ticket.asignado?.nombre_completo || "— nadie lo ha tomado todavía —"}</p>
        </div>

        {ticket.resolutor?.nombre_completo && (
          <p className="text-xs text-gray-600 mt-2">
            Resuelto por {ticket.resolutor.nombre_completo}
            {ticket.resuelto_en && ` · ${format(new Date(ticket.resuelto_en), "d MMM, h:mm a", { locale: es })}`}
          </p>
        )}

        {error && <p className="text-sm text-signal-urgent mt-3">{error}</p>}

        <div className="flex flex-wrap gap-2 mt-4">
          {!ticket.asignado_a && ticket.estado === "abierto" && (
            <button onClick={() => accion(() => tomarTicket(ticket.id))} disabled={pending} className="btn-primary text-sm">
              Tomar este ticket
            </button>
          )}
          {ticket.estado !== "resuelto" && ticket.estado !== "cerrado" && (
            <button onClick={() => accion(() => cambiarEstadoTicket(ticket.id, "resuelto"))} disabled={pending} className="btn-secondary text-sm">
              Marcar como resuelto
            </button>
          )}
          {ticket.estado === "resuelto" && (
            <button onClick={() => accion(() => cambiarEstadoTicket(ticket.id, "cerrado"))} disabled={pending} className="btn-secondary text-sm">
              Cerrar ticket
            </button>
          )}
          {(ticket.estado === "resuelto" || ticket.estado === "cerrado") && (
            <button onClick={() => accion(() => cambiarEstadoTicket(ticket.id, "abierto"))} disabled={pending} className="text-sm text-gray-500 hover:text-gray-300 underline">
              Reabrir
            </button>
          )}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-display font-semibold mb-3">Comentarios</h2>
        <div className="space-y-3 mb-4 max-h-80 overflow-y-auto">
          {comentarios.length === 0 && <p className="text-sm text-gray-500">Aún no hay comentarios.</p>}
          {comentarios.map((c) => (
            <div key={c.id} className="bg-base-900 border border-base-600 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">
                {c.autor?.nombre_completo || "—"} · {format(new Date(c.created_at), "d MMM, h:mm a", { locale: es })}
              </p>
              <p className="text-sm text-gray-200 whitespace-pre-wrap">{c.mensaje}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && enviarComentario()}
            placeholder="Escribe un comentario…"
            className="input-field flex-1"
          />
          <button onClick={enviarComentario} disabled={pending || !mensaje.trim()} className="btn-primary px-4">
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
