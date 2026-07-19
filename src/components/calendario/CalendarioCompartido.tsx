"use client";

import { useEffect, useMemo, useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isWithinInterval,
  addMonths,
  subMonths,
  format,
} from "date-fns";
import { es } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import type { EventoCalendario, EventoInvitado, Perfil } from "@/lib/types";
import ModalEvento from "@/components/calendario/ModalEvento";
import DetalleEvento from "@/components/calendario/DetalleEvento";

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

export default function CalendarioCompartido({
  perfiles,
  clientes,
  userId,
}: {
  perfiles: PerfilLigero[];
  clientes: ClienteLigero[];
  userId: string;
}) {
  const [mesActual, setMesActual] = useState(() => startOfMonth(new Date()));
  const [eventos, setEventos] = useState<EventoCalendario[]>([]);
  const [invitados, setInvitados] = useState<Record<string, EventoInvitado[]>>({});
  const [cargando, setCargando] = useState(true);

  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
  const [eventoEnEdicion, setEventoEnEdicion] = useState<EventoCalendario | null>(null);
  const [eventoSeleccionado, setEventoSeleccionado] = useState<EventoCalendario | null>(null);

  const perfilesPorId = useMemo(() => new Map(perfiles.map((p) => [p.id, p])), [perfiles]);

  const diasVisibles = useMemo(() => {
    const inicio = startOfWeek(startOfMonth(mesActual), { weekStartsOn: 1 });
    const fin = endOfWeek(endOfMonth(mesActual), { weekStartsOn: 1 });
    return eachDayOfInterval({ start: inicio, end: fin });
  }, [mesActual]);

  async function cargarEventos() {
    setCargando(true);
    const supabase = createClient();
    const rangoInicio = diasVisibles[0];
    const rangoFin = diasVisibles[diasVisibles.length - 1];

    const { data: eventosData } = await supabase
      .from("eventos_calendario")
      .select("*")
      .lte("fecha_inicio", rangoFin.toISOString())
      .gte("fecha_fin", rangoInicio.toISOString())
      .order("fecha_inicio");

    setEventos(eventosData || []);

    if (eventosData && eventosData.length > 0) {
      const { data: invitadosData } = await supabase
        .from("evento_invitados")
        .select("*")
        .in("evento_id", eventosData.map((e) => e.id));

      const agrupados: Record<string, EventoInvitado[]> = {};
      for (const inv of invitadosData || []) {
        if (!agrupados[inv.evento_id]) agrupados[inv.evento_id] = [];
        agrupados[inv.evento_id].push(inv);
      }
      setInvitados(agrupados);
    } else {
      setInvitados({});
    }
    setCargando(false);
  }

  useEffect(() => {
    cargarEventos();
    const supabase = createClient();
    const canal = supabase
      .channel("calendario-compartido")
      .on("postgres_changes", { event: "*", schema: "public", table: "eventos_calendario" }, () => cargarEventos())
      .on("postgres_changes", { event: "*", schema: "public", table: "evento_invitados" }, () => cargarEventos())
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesActual]);

  function eventosDelDia(dia: Date) {
    return eventos.filter((e) => isWithinInterval(dia, { start: new Date(e.fecha_inicio), end: new Date(e.fecha_fin) }) || isSameDay(dia, new Date(e.fecha_inicio)));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => setMesActual((m) => subMonths(m, 1))} className="btn-secondary px-3 py-1.5 text-sm">
            ←
          </button>
          <p className="font-display font-semibold text-lg capitalize w-44 text-center">{format(mesActual, "MMMM yyyy", { locale: es })}</p>
          <button onClick={() => setMesActual((m) => addMonths(m, 1))} className="btn-secondary px-3 py-1.5 text-sm">
            →
          </button>
          <button onClick={() => setMesActual(startOfMonth(new Date()))} className="text-xs text-gray-500 hover:text-gray-300 underline">
            Hoy
          </button>
        </div>
        <button onClick={() => setModalCrearAbierto(true)} className="btn-primary text-sm">
          + Nuevo evento
        </button>
      </div>

      <div className="card p-3 sm:p-4">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
            <div key={d} className="text-center text-xs text-gray-500 font-medium py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {diasVisibles.map((dia) => {
            const esDelMes = isSameMonth(dia, mesActual);
            const esHoy = isSameDay(dia, new Date());
            const eventosDia = eventosDelDia(dia);
            return (
              <div
                key={dia.toISOString()}
                className={`min-h-[90px] sm:min-h-[110px] rounded-lg border p-1.5 ${
                  esDelMes ? "border-base-600 bg-base-900" : "border-base-700/40 bg-transparent"
                }`}
              >
                <p className={`text-xs mb-1 ${esHoy ? "inline-flex items-center justify-center w-5 h-5 rounded-full bg-accent text-base-900 font-bold" : esDelMes ? "text-gray-400" : "text-gray-700"}`}>
                  {format(dia, "d")}
                </p>
                <div className="space-y-1">
                  {eventosDia.slice(0, 3).map((e) => {
                    const creador = perfilesPorId.get(e.creado_por);
                    return (
                      <button
                        key={e.id}
                        onClick={() => setEventoSeleccionado(e)}
                        className="w-full text-left text-[10px] sm:text-xs px-1.5 py-0.5 rounded truncate text-white font-medium"
                        style={{ backgroundColor: creador?.color_calendario || "#3AA7A1" }}
                        title={e.titulo}
                      >
                        {e.todo_el_dia ? "" : format(new Date(e.fecha_inicio), "HH:mm") + " "}
                        {e.titulo}
                      </button>
                    );
                  })}
                  {eventosDia.length > 3 && <p className="text-[10px] text-gray-500 px-1">+{eventosDia.length - 3} más</p>}
                </div>
              </div>
            );
          })}
        </div>
        {cargando && <p className="text-xs text-gray-600 mt-2">Actualizando…</p>}
      </div>

      {/* Leyenda de colores por persona */}
      <div className="flex flex-wrap gap-3">
        {perfiles.map((p) => (
          <div key={p.id} className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color_calendario || "#3AA7A1" }} />
            {p.nombre_completo}
          </div>
        ))}
      </div>

      {modalCrearAbierto && (
        <ModalEvento
          perfiles={perfiles}
          clientes={clientes}
          userId={userId}
          onCerrar={() => setModalCrearAbierto(false)}
          onGuardado={() => {
            setModalCrearAbierto(false);
            cargarEventos();
          }}
        />
      )}

      {eventoEnEdicion && (
        <ModalEvento
          perfiles={perfiles}
          clientes={clientes}
          userId={userId}
          eventoExistente={eventoEnEdicion}
          invitadosExistentes={invitados[eventoEnEdicion.id] || []}
          onCerrar={() => setEventoEnEdicion(null)}
          onGuardado={() => {
            setEventoEnEdicion(null);
            cargarEventos();
          }}
        />
      )}

      {eventoSeleccionado && (
        <DetalleEvento
          evento={eventoSeleccionado}
          invitados={invitados[eventoSeleccionado.id] || []}
          perfilesPorId={perfilesPorId}
          clientes={clientes}
          userId={userId}
          onCerrar={() => setEventoSeleccionado(null)}
          onEditar={() => {
            setEventoEnEdicion(eventoSeleccionado);
            setEventoSeleccionado(null);
          }}
          onEliminado={() => {
            setEventoSeleccionado(null);
            cargarEventos();
          }}
        />
      )}
    </div>
  );
}
