"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
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
  const [perfilSeleccionado, setPerfilSeleccionado] = useState(userId);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);

  async function cargar() {
    setCargando(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("agenda_personal")
      .select("*")
      .eq("perfil_id", perfilSeleccionado)
      .lte("fecha_inicio", endOfMonth(mes).toISOString())
      .gte("fecha_fin", startOfMonth(mes).toISOString())
      .order("fecha_inicio");
    setBloques(data || []);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes, perfilSeleccionado]);

  const perfil = useMemo(() => perfiles.find((p) => p.id === perfilSeleccionado), [perfiles, perfilSeleccionado]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <label className="label-field">Consultar agenda de</label>
          <select value={perfilSeleccionado} onChange={(e) => setPerfilSeleccionado(e.target.value)} className="input-field max-w-xs">
            {perfiles.map((p) => <option key={p.id} value={p.id}>{p.nombre_completo}</option>)}
          </select>
        </div>
        <button onClick={() => setModalAbierto(true)} className="btn-primary text-sm">+ Añadir bloque</button>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={() => setMes((actual) => new Date(actual.getFullYear(), actual.getMonth() - 1, 1))} className="btn-secondary px-3 py-1.5 text-sm">←</button>
        <p className="font-display font-semibold capitalize w-40 text-center">{format(mes, "MMMM yyyy", { locale: es })}</p>
        <button onClick={() => setMes((actual) => new Date(actual.getFullYear(), actual.getMonth() + 1, 1))} className="btn-secondary px-3 py-1.5 text-sm">→</button>
      </div>

      <div className="card p-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: perfil?.color_calendario || "#3AA7A1" }} />
          <h2 className="font-display font-semibold">Bloques de {perfil?.nombre_completo || "la persona"}</h2>
        </div>
        {cargando ? <p className="text-sm text-gray-500">Cargando agenda...</p> : bloques.length === 0 ? <p className="text-sm text-gray-500">No hay bloques registrados este mes.</p> : (
          <div className="space-y-2">
            {bloques.map((bloque) => (
              <div key={bloque.id} className="flex items-center justify-between gap-3 border-b border-base-700 py-2 last:border-0">
                <div>
                  <p className="text-sm font-medium">{bloque.titulo}</p>
                  <p className="text-xs text-gray-500">{format(new Date(bloque.fecha_inicio), "EEE d MMM, HH:mm", { locale: es })} - {format(new Date(bloque.fecha_fin), "HH:mm")}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${bloque.estado === "disponible" ? "bg-green-500/15 text-green-400" : "bg-signal-urgent/15 text-signal-urgent"}`}>
                  {bloque.estado === "disponible" ? "Disponible" : "Ocupado"}
                </span>
                {bloque.perfil_id === userId && <button onClick={async () => { await eliminarBloqueAgendaPersonal(bloque.id); cargar(); }} className="text-xs text-gray-500 hover:text-signal-urgent">Eliminar</button>}
              </div>
            ))}
          </div>
        )}
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