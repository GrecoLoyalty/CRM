"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import { PRIORIDAD_LABEL, PRIORIDAD_COLOR, ESTADO_TICKET_LABEL, ESTADO_TICKET_COLOR, DEPTO_LABEL } from "@/lib/types";
import ModalNuevoTicket from "@/components/tickets/ModalNuevoTicket";

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

type TicketConJoins = any;

const TABS = [
  { id: "para_mi", label: "Para mí" },
  { id: "creados", label: "Creados por mí" },
  { id: "todos", label: "Todos" },
] as const;

export default function ListaTickets({
  ticketsIniciales,
  perfiles,
  clientes,
  userId,
}: {
  ticketsIniciales: TicketConJoins[];
  perfiles: PerfilLigero[];
  clientes: ClienteLigero[];
  userId: string;
}) {
  const [tickets, setTickets] = useState<TicketConJoins[]>(ticketsIniciales);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("para_mi");
  const [modalAbierto, setModalAbierto] = useState(false);
  const miPerfil = perfiles.find((p) => p.id === userId);

  async function recargar() {
    const supabase = createClient();
    const { data } = await supabase
      .from("tickets")
      .select("*, creador:perfiles!creado_por(nombre_completo), asignado:perfiles!asignado_a(nombre_completo), cliente:clientes(nombre_empresa)")
      .order("created_at", { ascending: false });
    if (data) setTickets(data);
  }

  useEffect(() => {
    const supabase = createClient();
    const canal = supabase
      .channel("tickets-listado")
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, () => recargar())
      .on("postgres_changes", { event: "*", schema: "public", table: "ticket_destinatarios" }, () => recargar())
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtrados = useMemo(() => {
    if (tab === "creados") return tickets.filter((t) => t.creado_por === userId);
    if (tab === "todos") return tickets;
    // "para_mi": asignado a mí, o dirigido a mi depto y sin resolver/cerrar
    return tickets.filter(
      (t) => t.asignado_a === userId || (t.depto_destino && t.estado !== "resuelto" && t.estado !== "cerrado")
    );
  }, [tickets, tab, userId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-base-900 border border-base-600 rounded-lg p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                tab === t.id ? "bg-accent/20 text-accent-soft" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button onClick={() => setModalAbierto(true)} className="btn-primary text-sm">
          + Nuevo ticket
        </button>
      </div>

      {filtrados.length === 0 && (
        <div className="card p-8 text-center text-sm text-gray-500">No hay tickets en esta vista.</div>
      )}

      <div className="space-y-2">
        {filtrados.map((t) => (
          <Link
            key={t.id}
            href={`/dashboard/tickets/${t.id}`}
            className="card p-4 flex items-center justify-between gap-3 hover:border-accent/40 transition-colors block"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORIDAD_COLOR[t.prioridad as keyof typeof PRIORIDAD_COLOR]}`}>
                  {PRIORIDAD_LABEL[t.prioridad as keyof typeof PRIORIDAD_LABEL]}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_TICKET_COLOR[t.estado as keyof typeof ESTADO_TICKET_COLOR]}`}>
                  {ESTADO_TICKET_LABEL[t.estado as keyof typeof ESTADO_TICKET_LABEL]}
                </span>
                {t.depto_destino && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-base-700 text-gray-400">
                    {DEPTO_LABEL[t.depto_destino as keyof typeof DEPTO_LABEL]}
                  </span>
                )}
                {t.cliente?.nombre_empresa && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-base-700 text-gray-400">🏢 {t.cliente.nombre_empresa}</span>
                )}
              </div>
              <p className="font-medium truncate">{t.titulo}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {t.creador?.nombre_completo || "—"} · {format(new Date(t.created_at), "d MMM, h:mm a", { locale: es })}
                {t.asignado?.nombre_completo && ` · Trabajando: ${t.asignado.nombre_completo}`}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {modalAbierto && (
        <ModalNuevoTicket
          perfiles={perfiles}
          clientes={clientes}
          onCerrar={() => setModalAbierto(false)}
          onCreado={() => {
            setModalAbierto(false);
            recargar();
          }}
        />
      )}
    </div>
  );
}
