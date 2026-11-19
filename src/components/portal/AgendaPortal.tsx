"use client";

import { useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isWithinInterval,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";

export interface EventoPortal {
  id: string;
  titulo: string;
  descripcion: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  todo_el_dia: boolean;
  ubicacion: string | null;
}

function eventosDelDia(eventos: EventoPortal[], dia: Date) {
  return eventos.filter((evento) =>
    isWithinInterval(dia, {
      start: startOfDay(new Date(evento.fecha_inicio)),
      end: endOfDay(new Date(evento.fecha_fin)),
    })
  );
}

export default function AgendaPortal({ eventos }: { eventos: EventoPortal[] }) {
  const [mesActual, setMesActual] = useState(() =>
    startOfMonth(eventos.length ? new Date(eventos[0].fecha_inicio) : new Date())
  );
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(() =>
    eventos.length ? format(new Date(eventos[0].fecha_inicio), "yyyy-MM-dd") : null
  );

  const diasVisibles = eachDayOfInterval({
    start: startOfWeek(startOfMonth(mesActual), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(mesActual), { weekStartsOn: 1 }),
  });
  const fechaSeleccionada = diaSeleccionado ? new Date(`${diaSeleccionado}T12:00:00`) : null;
  const reunionesSeleccionadas = fechaSeleccionada ? eventosDelDia(eventos, fechaSeleccionada) : [];

  function cambiarMes(direccion: -1 | 1) {
    const nuevoMes = direccion === -1 ? subMonths(mesActual, 1) : addMonths(mesActual, 1);
    setMesActual(nuevoMes);
    const primerEventoDelMes = eventos.find((evento) => {
      const inicio = new Date(evento.fecha_inicio);
      const fin = new Date(evento.fecha_fin);
      return inicio <= endOfMonth(nuevoMes) && fin >= startOfMonth(nuevoMes);
    });
    setDiaSeleccionado(
      primerEventoDelMes
        ? format(new Date(primerEventoDelMes.fecha_inicio), "yyyy-MM-dd")
        : null
    );
  }

  return (
    <section className="mt-10" aria-labelledby="eventos-portal-heading">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-wide text-gray-500">Agenda del proyecto</p>
        <h2 id="eventos-portal-heading" className="text-lg font-display font-semibold mt-1">
          Próximas reuniones
        </h2>
      </div>

      <div className="card p-3 sm:p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <button
            type="button"
            onClick={() => cambiarMes(-1)}
            className="btn-secondary px-3 py-1.5"
            aria-label="Mes anterior"
          >
            ←
          </button>
          <h3 className="font-display font-semibold capitalize text-base sm:text-lg">
            {format(mesActual, "MMMM yyyy", { locale: es })}
          </h3>
          <button
            type="button"
            onClick={() => cambiarMes(1)}
            className="btn-secondary px-3 py-1.5"
            aria-label="Mes siguiente"
          >
            →
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((dia) => (
            <div key={dia} className="py-2 text-center text-[10px] sm:text-xs font-medium text-gray-500">
              {dia}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1" role="group" aria-label="Días del calendario">
          {diasVisibles.map((dia) => {
            const reuniones = eventosDelDia(eventos, dia);
            const clave = format(dia, "yyyy-MM-dd");
            const seleccionado = clave === diaSeleccionado;

            return (
              <button
                key={clave}
                type="button"
                onClick={() => {
                  if (!isSameMonth(dia, mesActual)) setMesActual(startOfMonth(dia));
                  setDiaSeleccionado(clave);
                }}
                aria-pressed={seleccionado}
                aria-label={`${format(dia, "EEEE d 'de' MMMM", { locale: es })}${reuniones.length ? `, ${reuniones.length} reuniones` : ""}`}
                className={`min-h-[54px] sm:min-h-[76px] rounded-lg border p-1 sm:p-2 text-left transition-colors ${
                  seleccionado
                    ? "border-accent bg-accent/10"
                    : isSameMonth(dia, mesActual)
                      ? "border-base-600 bg-base-900 hover:border-base-500"
                      : "border-base-700/40 bg-base-900/30 text-gray-600"
                }`}
              >
                <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                  seleccionado ? "bg-accent text-base-950 font-bold" : "text-gray-300"
                }`}>
                  {format(dia, "d")}
                </span>
                {reuniones.length > 0 && (
                  <>
                    <span className="mt-1 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                      <span className="text-[9px] text-accent-soft">{reuniones.length}</span>
                    </span>
                    <span className="hidden sm:block mt-1 text-[10px] text-gray-400 truncate">
                      {reuniones[0].titulo}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-4 border-t border-base-700 pt-4">
          <p className="text-xs text-gray-500 mb-3">
            {fechaSeleccionada
              ? format(fechaSeleccionada, "EEEE d 'de' MMMM", { locale: es })
              : "Selecciona un día para consultar sus reuniones"}
          </p>
          {reunionesSeleccionadas.length > 0 ? (
            <ul className="space-y-2">
              {reunionesSeleccionadas.map((evento) => (
                <li key={evento.id} className="rounded-lg border border-base-600 bg-base-800/70 p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <h4 className="font-medium text-sm text-gray-100">{evento.titulo}</h4>
                    <span className="text-xs font-medium text-accent-soft shrink-0">
                      {evento.todo_el_dia
                        ? "Todo el día"
                        : `${format(new Date(evento.fecha_inicio), "HH:mm")} – ${format(new Date(evento.fecha_fin), "HH:mm")}`}
                    </span>
                  </div>
                  {evento.descripcion && <p className="text-sm text-gray-400 mt-2">{evento.descripcion}</p>}
                  {evento.ubicacion && <p className="text-xs text-gray-500 mt-2">{evento.ubicacion}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">
              {eventos.length ? "No hay reuniones para este día." : "No hay reuniones próximas compartidas."}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
