"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import { crearBloqueAgendaPersonal, eliminarBloqueAgendaPersonal } from "@/app/dashboard/calendario/actions";
import type { AgendaPersonal } from "@/lib/types";

interface PerfilAgenda {
  id: string;
  nombre_completo: string;
  color_calendario: string | null;
}

export default function AgendaPersonal({ perfiles, userId }: { perfiles: PerfilAgenda[]; userId: string }) {
  const [mes, setMes] = useState(() => startOfMonth(new Date()));
  const [bloques, setBloques] = useState<AgendaPersonal[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);

  const diasVisibles = useMemo(() => eachDayOfInterval({
    start: startOfWeek(startOfMonth(mes), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(mes), { weekStartsOn: 1 }),
  }), [mes]);

  async function cargar() {
    setCargando(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("agenda_personal")
      .select("*")
      .eq("perfil_id", userId)
      .lte("fecha_inicio", endOfMonth(mes).toISOString())
      .gte("fecha_fin", startOfMonth(mes).toISOString())
      .order("fecha_inicio");
    setBloques(data || []);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes, userId]);

  const bloquesDelDia = (dia: Date) => bloques.filter((bloque) => {
    const inicio = new Date(bloque.fecha_inicio);
    const fin = new Date(bloque.fecha_fin);
    return isSameDay(dia, inicio) || (dia >= inicio && dia <= fin);
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Mi calendario personal</p>
          <p className="text-sm text-gray-400">Marca cuándo estás ocupado o disponible para el equipo.</p>
        </div>
        <button onClick={() => setModalAbierto(true)} className="btn-primary text-sm">+ Añadir bloque</button>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={() => setMes((actual) => subMonths(actual, 1))} className="btn-secondary px-3 py-1.5 text-sm">←</button>
        <p className="font-display font-semibold capitalize w-40 text-center">{format(mes, "MMMM yyyy", { locale: es })}</p>
        <button onClick={() => setMes((actual) => addMonths(actual, 1))} className="btn-secondary px-3 py-1.5 text-sm">→</button>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-7 gap-1 mb-2">{["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((dia) => <div key={dia} className="text-center text-xs text-gray-500 font-medium py-1">{dia}</div>)}</div>
        {cargando ? <p className="text-sm text-gray-500 py-6">Cargando agenda...</p> : <div className="grid grid-cols-7 gap-1">
          {diasVisibles.map((dia) => {
            const bloquesDia = bloquesDelDia(dia);
            return <div key={dia.toISOString()} className={`min-h-[108px] rounded-lg border p-1.5 ${isSameMonth(dia, mes) ? "border-base-600 bg-base-900" : "border-base-700/40"}`}>
              <p className={`text-xs mb-1 ${isSameDay(dia, new Date()) ? "inline-flex items-center justify-center w-5 h-5 rounded-full bg-accent text-base-900 font-bold" : "text-gray-400"}`}>{format(dia, "d")}</p>
              <div className="space-y-1">{bloquesDia.map((bloque) => <div key={bloque.id} className={`group relative rounded px-1.5 py-1 text-[10px] sm:text-xs ${bloque.estado === "disponible" ? "bg-green-500/15 text-green-300" : "bg-signal-urgent/15 text-signal-urgent"}`} title={`${bloque.titulo} · ${format(new Date(bloque.fecha_inicio), "HH:mm")} - ${format(new Date(bloque.fecha_fin), "HH:mm")}`}>
                <p className="truncate font-medium">{bloque.titulo}</p><p>{format(new Date(bloque.fecha_inicio), "HH:mm")} - {format(new Date(bloque.fecha_fin), "HH:mm")}</p>
                <button onClick={() => eliminarBloqueAgendaPersonal(bloque.id).then(cargar)} className="absolute right-1 top-1 hidden group-hover:block text-[10px]" aria-label={`Eliminar ${bloque.titulo}`}>×</button>
              </div>)}</div>
            </div>;
          })}
        </div>}
      </div>

      {modalAbierto && <NuevoBloque onCerrar={() => setModalAbierto(false)} onGuardado={() => { setModalAbierto(false); cargar(); }} />}
    </div>
  );
}

function NuevoBloque({ onCerrar, onGuardado }: { onCerrar: () => void; onGuardado: () => void }) {
  const ahora = new Date();
  const [titulo, setTitulo] = useState("");
  const [inicio, setInicio] = useState(format(ahora, "yyyy-MM-dd'T'HH:mm"));
  const [fin, setFin] = useState(format(new Date(ahora.getTime() + 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm"));
  const [estado, setEstado] = useState<"ocupado" | "disponible">("ocupado");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function guardar() {
    startTransition(async () => {
      try {
        await crearBloqueAgendaPersonal({ titulo, fechaInicio: new Date(inicio).toISOString(), fechaFin: new Date(fin).toISOString(), estado });
        onGuardado();
      } catch (e: any) { setError(e.message || "No se pudo guardar el bloque."); }
    });
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onCerrar}>
      <div className="card w-full max-w-lg p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between"><h2 className="font-display font-semibold text-lg">Añadir a mi agenda</h2><button onClick={onCerrar} className="text-gray-500 text-xl">✕</button></div>
        <div><label className="label-field">Título</label><input value={titulo} onChange={(e) => setTitulo(e.target.value)} className="input-field" placeholder="Ej. Grabación, comida, libre" /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label className="label-field">Inicia</label><input type="datetime-local" value={inicio} onChange={(e) => setInicio(e.target.value)} className="input-field" /></div><div><label className="label-field">Termina</label><input type="datetime-local" value={fin} onChange={(e) => setFin(e.target.value)} className="input-field" /></div></div>
        <div><label className="label-field">Estado</label><select value={estado} onChange={(e) => setEstado(e.target.value as "ocupado" | "disponible")} className="input-field"><option value="ocupado">Ocupado</option><option value="disponible">Disponible</option></select></div>
        {error && <p className="text-sm text-signal-urgent">{error}</p>}
        <div className="flex gap-2 pt-2"><button onClick={onCerrar} className="btn-secondary flex-1">Cancelar</button><button onClick={guardar} disabled={pending} className="btn-primary flex-1">{pending ? "Guardando..." : "Guardar bloque"}</button></div>
      </div>
    </div>
  );
}