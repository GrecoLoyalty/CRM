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
import { cambiarEstadoBloqueAgendaPersonal, crearBloqueAgendaPersonal, editarBloqueAgendaPersonal, eliminarBloqueAgendaPersonal } from "@/app/dashboard/calendario/actions";
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
  const [bloqueSeleccionado, setBloqueSeleccionado] = useState<AgendaPersonal | null>(null);

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
              <div className="space-y-1">{bloquesDia.map((bloque) => <button key={bloque.id} onClick={() => setBloqueSeleccionado(bloque)} className={`group relative block w-full rounded px-1.5 py-1 text-left text-[10px] sm:text-xs ${bloque.estado === "disponible" ? "bg-green-500/15 text-green-300" : "bg-signal-urgent/15 text-signal-urgent"}`} title={`${bloque.titulo} · ${format(new Date(bloque.fecha_inicio), "HH:mm")} - ${format(new Date(bloque.fecha_fin), "HH:mm")} · ${bloque.ubicacion || ""} · ${bloque.notas || ""} · ${bloque.alguien_ira_conmigo || ""} · ${bloque.recordatorio || ""}`}>
                <p className="truncate font-medium">{bloque.titulo}</p><p>{format(new Date(bloque.fecha_inicio), "HH:mm")} - {format(new Date(bloque.fecha_fin), "HH:mm")}</p>
                {bloque.ubicacion && <p className="truncate text-[9px] text-gray-300">📍 {bloque.ubicacion}</p>}
                {bloque.alguien_ira_conmigo && <p className="truncate text-[9px] text-gray-300">👤 {bloque.alguien_ira_conmigo}</p>}
                {bloque.recordatorio && <p className="truncate text-[9px] text-gray-300">🔔 {bloque.recordatorio}</p>}
                {bloque.notas && <p className="truncate text-[9px] text-gray-300">✎ {bloque.notas}</p>}
                <span className="absolute right-1 top-1 hidden group-hover:block text-[10px]">⋮</span>
              </button>)}</div>
            </div>;
          })}
        </div>}
      </div>

      {modalAbierto && <NuevoBloque onCerrar={() => setModalAbierto(false)} onGuardado={() => { setModalAbierto(false); cargar(); }} />}
      {bloqueSeleccionado && <DetalleBloqueAgenda bloque={bloqueSeleccionado} onCerrar={() => setBloqueSeleccionado(null)} onDeleted={() => { setBloqueSeleccionado(null); cargar(); }} onUpdated={() => { setBloqueSeleccionado(null); cargar(); }} />}
    </div>
  );
}

function DetalleBloqueAgenda({ bloque, onCerrar, onDeleted, onUpdated }: { bloque: AgendaPersonal; onCerrar: () => void; onDeleted: () => void; onUpdated: () => void }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cambiarEstado(estadoBloque: "pendiente" | "listo") {
    try {
      await cambiarEstadoBloqueAgendaPersonal(bloque.id, estadoBloque);
      onUpdated();
    } catch (e: any) {
      setError(e.message || "No se pudo cambiar el estado.");
    }
  }

  async function eliminar() {
    if (!window.confirm(`¿Eliminar "${bloque.titulo}"?`)) return;
    try {
      await eliminarBloqueAgendaPersonal(bloque.id);
      onDeleted();
    } catch (e: any) {
      setError(e.message || "No se pudo eliminar el bloque.");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onCerrar}>
      <div className="card w-full max-w-md p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h2 className="font-display font-semibold text-lg">Detalle del bloque</h2>
          <button onClick={onCerrar} className="text-gray-500 text-xl">✕</button>
        </div>
        {error && <p className="text-sm text-signal-urgent">{error}</p>}
        {!editing ? (
          <>
            <div className="space-y-2 text-sm text-gray-300">
              <div className="flex justify-between"><span className="text-gray-500">Título</span><span className="font-medium">{bloque.titulo}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Estado</span><span className="font-medium">{bloque.estado}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Estado del bloque</span><span className="font-medium">{bloque.estado_bloque || "pendiente"}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Inicio</span><span>{format(new Date(bloque.fecha_inicio), "dd MMM yyyy HH:mm", { locale: es })}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Fin</span><span>{format(new Date(bloque.fecha_fin), "dd MMM yyyy HH:mm", { locale: es })}</span></div>
              {bloque.ubicacion && <div className="flex justify-between"><span className="text-gray-500">Ubicación</span><span>{bloque.ubicacion}</span></div>}
              {bloque.alguien_ira_conmigo && <div className="flex justify-between"><span className="text-gray-500">Acompañante</span><span>{bloque.alguien_ira_conmigo}</span></div>}
              {bloque.recordatorio && <div className="flex justify-between"><span className="text-gray-500">Recordatorio</span><span>{bloque.recordatorio}</span></div>}
              {bloque.notas && <div className="border-t border-base-600 pt-2"><span className="text-gray-500 block">Notas</span><span className="text-gray-300 whitespace-pre-wrap">{bloque.notas}</span></div>}
            </div>
            <div className="flex flex-wrap gap-2 justify-end">
              <button onClick={() => cambiarEstado(bloque.estado_bloque === "listo" ? "pendiente" : "listo")} className="btn-secondary px-3 py-1.5 text-xs">{bloque.estado_bloque === "listo" ? "↺ Pendiente" : "✓ Listo"}</button>
              <button onClick={() => setEditing(true)} className="btn-secondary px-3 py-1.5 text-xs">✎ Editar</button>
              <button onClick={eliminar} className="text-signal-urgent text-xs px-3 py-1.5 hover:underline">🗑 Eliminar</button>
            </div>
          </>
        ) : (
          <EditarBloqueForm bloque={bloque} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); onUpdated(); }} />
        )}
      </div>
    </div>
  );
}

function EditarBloqueForm({ bloque, onCancel, onSaved }: { bloque: AgendaPersonal; onCancel: () => void; onSaved: () => void }) {
  const [titulo, setTitulo] = useState(bloque.titulo);
  const [inicio, setInicio] = useState(format(new Date(bloque.fecha_inicio), "yyyy-MM-dd'T'HH:mm"));
  const [fin, setFin] = useState(format(new Date(bloque.fecha_fin), "yyyy-MM-dd'T'HH:mm"));
  const [estado, setEstado] = useState<"ocupado" | "disponible">(bloque.estado);
  const [estadoBloque, setEstadoBloque] = useState<"pendiente" | "listo">(bloque.estado_bloque || "pendiente");
  const [ubicacion, setUbicacion] = useState(bloque.ubicacion || "");
  const [notas, setNotas] = useState(bloque.notas || "");
  const [alguienIraConmigo, setAlguienIraConmigo] = useState(bloque.alguien_ira_conmigo || "");
  const [recordatorio, setRecordatorio] = useState(bloque.recordatorio || "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function guardar() {
    startTransition(async () => {
      try {
        await editarBloqueAgendaPersonal(bloque.id, { titulo, fechaInicio: new Date(inicio).toISOString(), fechaFin: new Date(fin).toISOString(), estado, estadoBloque, notas, ubicacion, alguienIraConmigo, recordatorio });
        onSaved();
      } catch (e: any) { setError(e.message || "No se pudo guardar el bloque."); }
    });
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-signal-urgent">{error}</p>}
      <div><label className="label-field">Título</label><input value={titulo} onChange={(e) => setTitulo(e.target.value)} className="input-field" /></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label className="label-field">Inicia</label><input type="datetime-local" value={inicio} onChange={(e) => setInicio(e.target.value)} className="input-field" /></div><div><label className="label-field">Termina</label><input type="datetime-local" value={fin} onChange={(e) => setFin(e.target.value)} className="input-field" /></div></div>
      <div><label className="label-field">Estado</label><select value={estado} onChange={(e) => setEstado(e.target.value as "ocupado" | "disponible")} className="input-field"><option value="ocupado">Ocupado</option><option value="disponible">Disponible</option></select></div>
      <div><label className="label-field">Estado bloque</label><select value={estadoBloque} onChange={(e) => setEstadoBloque(e.target.value as "pendiente" | "listo")} className="input-field"><option value="pendiente">Pendiente</option><option value="listo">Listo</option></select></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label className="label-field">Ubicación</label><input value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} className="input-field" /></div><div><label className="label-field">Alguien irá conmigo</label><input value={alguienIraConmigo} onChange={(e) => setAlguienIraConmigo(e.target.value)} className="input-field" /></div></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label className="label-field">Recordatorio</label><input value={recordatorio} onChange={(e) => setRecordatorio(e.target.value)} className="input-field" /></div><div><label className="label-field">Notas</label><textarea value={notas} onChange={(e) => setNotas(e.target.value)} className="input-field" rows={3} /></div></div>
      <div className="flex gap-2 pt-2">
        <button onClick={onCancel} className="btn-secondary flex-1">Cancelar</button>
        <button onClick={guardar} disabled={pending} className="btn-primary flex-1">{pending ? "Guardando..." : "Guardar"}</button>
      </div>
    </div>
  );
}

function NuevoBloque({ onCerrar, onGuardado }: { onCerrar: () => void; onGuardado: () => void }) {
  const ahora = new Date();
  const [titulo, setTitulo] = useState("");
  const [inicio, setInicio] = useState(format(ahora, "yyyy-MM-dd'T'HH:mm"));
  const [fin, setFin] = useState(format(new Date(ahora.getTime() + 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm"));
  const [estado, setEstado] = useState<"ocupado" | "disponible">("ocupado");
  const [estadoBloque, setEstadoBloque] = useState<"pendiente" | "listo">("pendiente");
  const [ubicacion, setUbicacion] = useState("");
  const [notas, setNotas] = useState("");
  const [alguienIraConmigo, setAlguienIraConmigo] = useState("");
  const [recordatorio, setRecordatorio] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function guardar() {
    startTransition(async () => {
      try {
        await crearBloqueAgendaPersonal({
          titulo,
          fechaInicio: new Date(inicio).toISOString(),
          fechaFin: new Date(fin).toISOString(),
          estado,
          estadoBloque,
          ubicacion,
          notas,
          alguienIraConmigo: alguienIraConmigo,
          recordatorio,
        });
        onGuardado();
      } catch (e: any) { setError(e.message || "No se pudo guardar el bloque."); }
    });
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onCerrar}>
      <div className="card w-full max-w-2xl p-5 space-y-3 max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between"><h2 className="font-display font-semibold text-lg">Añadir a mi agenda</h2><button onClick={onCerrar} className="text-gray-500 text-xl">✕</button></div>
        <div><label className="label-field">Título</label><input value={titulo} onChange={(e) => setTitulo(e.target.value)} className="input-field" placeholder="Ej. Grabación, comida, libre" /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label className="label-field">Inicia</label><input type="datetime-local" value={inicio} onChange={(e) => setInicio(e.target.value)} className="input-field" /></div><div><label className="label-field">Termina</label><input type="datetime-local" value={fin} onChange={(e) => setFin(e.target.value)} className="input-field" /></div></div>
        <div><label className="label-field">Estado</label><select value={estado} onChange={(e) => setEstado(e.target.value as "ocupado" | "disponible")} className="input-field"><option value="ocupado">Ocupado</option><option value="disponible">Disponible</option></select></div>
        <div><label className="label-field">Estado bloque</label><select value={estadoBloque} onChange={(e) => setEstadoBloque(e.target.value as "pendiente" | "listo")} className="input-field"><option value="pendiente">Pendiente</option><option value="listo">Listo</option></select></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="label-field">Ubicación</label><input value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} className="input-field" placeholder="Ej. Studio, oficina, etc." /></div>
          <div><label className="label-field">Alguien irá conmigo</label><input value={alguienIraConmigo} onChange={(e) => setAlguienIraConmigo(e.target.value)} className="input-field" placeholder="Nombre o equipo" /></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="label-field">Recordatorio</label><input value={recordatorio} onChange={(e) => setRecordatorio(e.target.value)} className="input-field" placeholder="Ej. Revisar brief, llevar equipo" /></div>
          <div><label className="label-field">Notas</label><textarea value={notas} onChange={(e) => setNotas(e.target.value)} className="input-field" rows={3} placeholder="Detalles extra..." /></div>
        </div>
        {error && <p className="text-sm text-signal-urgent">{error}</p>}
        <div className="flex gap-2 pt-2"><button onClick={onCerrar} className="btn-secondary flex-1">Cancelar</button><button onClick={guardar} disabled={pending} className="btn-primary flex-1">{pending ? "Guardando..." : "Guardar bloque"}</button></div>
      </div>
    </div>
  );
}

