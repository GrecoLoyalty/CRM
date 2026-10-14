"use client";

import { useMemo, useState } from "react";
import { eliminarPublicacion, guardarPublicacion, moverPublicacion } from "@/app/dashboard/marketing/actions";

type Marca = { id: string; nombre: string; color: string; plataformas_activas: string[]; activa: boolean };
type PerfilOpcion = { id: string; nombre_completo: string };
type GuionOpcion = { id: string; marca_id: string; titulo: string };
type Publicacion = {
  id: string; marca_id: string; plataforma: string; fecha_hora: string; guion_id: string | null;
  caption: string; hashtags: string[]; estado: "pendiente" | "publicado" | "cancelado";
  responsable_id: string | null; video_url: string | null; descarga_url: string | null; publicacion_url: string | null;
};
type Vista = "mes" | "semana" | "lista";

function diaLocal(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
function fechaLocal(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function datetimeLocal(value: string) {
  const date = new Date(value);
  return `${fechaLocal(date)}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
function inicioSemana(date: Date) {
  const start = diaLocal(date);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}
function isoDia(date: Date, original: string) {
  const next = new Date(original);
  next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
  return next.toISOString();
}

export default function CalendarioMarketing({ marcas, perfiles, guiones, publicaciones }: {
  marcas: Marca[]; perfiles: PerfilOpcion[]; guiones: GuionOpcion[]; publicaciones: Publicacion[];
}) {
  const [fecha, setFecha] = useState(() => diaLocal(new Date()));
  const [vista, setVista] = useState<Vista>("mes");
  const [filtroMarca, setFiltroMarca] = useState("");
  const [filtroPlataforma, setFiltroPlataforma] = useState("");
  const [filtroResponsable, setFiltroResponsable] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [seleccionado, setSeleccionado] = useState<Publicacion | null>(null);
  const [modal, setModal] = useState(false);
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [arrastrada, setArrastrada] = useState("");

  const marcasActivas = marcas.filter((m) => m.activa);
  const plataformas = [...new Set(marcas.flatMap((m) => m.plataformas_activas))].sort();
  const filtradas = useMemo(() => publicaciones.filter((p) =>
    (!filtroMarca || p.marca_id === filtroMarca)
    && (!filtroPlataforma || p.plataforma === filtroPlataforma)
    && (!filtroResponsable || p.responsable_id === filtroResponsable)
    && (!filtroEstado || p.estado === filtroEstado)
  ), [publicaciones, filtroMarca, filtroPlataforma, filtroResponsable, filtroEstado]);

  const dias = useMemo(() => {
    if (vista === "lista") {
      const start = inicioSemana(fecha);
      return Array.from({ length: 14 }, (_, i) => {
        const day = new Date(start);
        day.setDate(day.getDate() + i);
        return day;
      });
    }
    if (vista === "semana") {
      const start = inicioSemana(fecha);
      return Array.from({ length: 7 }, (_, i) => {
        const day = new Date(start);
        day.setDate(day.getDate() + i);
        return day;
      });
    }
    const first = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
    const start = inicioSemana(first);
    return Array.from({ length: 42 }, (_, i) => {
      const day = new Date(start);
      day.setDate(day.getDate() + i);
      return day;
    });
  }, [fecha, vista]);

  function moverRango(delta: number) {
    const next = new Date(fecha);
    next.setDate(next.getDate() + delta * (vista === "mes" ? 28 : vista === "semana" ? 7 : 14));
    setFecha(next);
  }
  function nuevo() {
    setSeleccionado(null);
    setError("");
    setModal(true);
  }
  async function guardar(form: FormData) {
    setOcupado(true);
    setError("");
    try {
      await guardarPublicacion({
        id: seleccionado?.id,
        marca_id: String(form.get("marca_id")),
        plataforma: String(form.get("plataforma")),
        fecha_hora: String(form.get("fecha_hora")),
        guion_id: String(form.get("guion_id") || "") || null,
        caption: String(form.get("caption") || ""),
        hashtags: String(form.get("hashtags") || "").split(/[\s,]+/).filter(Boolean),
        estado: String(form.get("estado")) as Publicacion["estado"],
        responsable_id: String(form.get("responsable_id") || "") || null,
        video_url: String(form.get("video_url") || "") || null,
        descarga_url: String(form.get("descarga_url") || "") || null,
        publicacion_url: String(form.get("publicacion_url") || "") || null,
      });
      setModal(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la publicación.");
    } finally {
      setOcupado(false);
    }
  }
  async function eliminar() {
    if (!seleccionado || !window.confirm("¿Eliminar esta publicación del calendario?")) return;
    setError("");
    try {
      await eliminarPublicacion(seleccionado.id);
      setModal(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar la publicación.");
    }
  }
  async function soltarEnDia(publicacionId: string, dia: Date) {
    const item = publicaciones.find((p) => p.id === publicacionId);
    if (!item || item.estado !== "pendiente") return;
    try {
      await moverPublicacion(item.id, isoDia(dia, item.fecha_hora));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo mover la publicación.");
    } finally {
      setArrastrada("");
    }
  }
  function publicacionesDelDia(day: Date) {
    return filtradas.filter((p) => fechaLocal(new Date(p.fecha_hora)) === fechaLocal(day))
      .sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora));
  }
  function abrirEdicion(pub: Publicacion) {
    setSeleccionado(pub);
    setError("");
    setModal(true);
  }

  const tituloRango = vista === "mes"
    ? fecha.toLocaleDateString("es-MX", { month: "long", year: "numeric" })
    : vista === "semana"
      ? `${dias[0].toLocaleDateString("es-MX", { day: "numeric", month: "short" })} – ${dias[6].toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}`
      : "Contenido de esta y la próxima semana";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="text-xl font-display font-semibold">Calendario de contenido</h2><p className="text-sm text-gray-500 mt-1">Planea publicaciones para todas tus marcas.</p></div>
        <button className="btn-primary" onClick={nuevo} disabled={!marcasActivas.length}>Programar contenido</button>
      </div>
      <div className="card p-3 sm:p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg bg-base-800 p-1">
            {(["mes", "semana", "lista"] as Vista[]).map((opcion) => <button key={opcion} aria-pressed={vista === opcion} onClick={() => setVista(opcion)} className={`px-3 py-1.5 rounded-md text-sm capitalize ${vista === opcion ? "bg-base-700 text-gray-100" : "text-gray-500 hover:text-gray-200"}`}>{opcion}</button>)}
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-ghost px-2" aria-label="Periodo anterior" onClick={() => moverRango(-1)}>‹</button>
            <button className="btn-ghost text-sm" onClick={() => setFecha(diaLocal(new Date()))}>Hoy</button>
            <button className="btn-ghost px-2" aria-label="Periodo siguiente" onClick={() => moverRango(1)}>›</button>
            <span className="text-sm text-gray-300 capitalize">{tituloRango}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <select aria-label="Filtrar por marca" className="input-field" value={filtroMarca} onChange={(e) => setFiltroMarca(e.target.value)}><option value="">Todas las marcas</option>{marcas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select>
          <select aria-label="Filtrar por plataforma" className="input-field" value={filtroPlataforma} onChange={(e) => setFiltroPlataforma(e.target.value)}><option value="">Todas las plataformas</option>{plataformas.map((p) => <option key={p}>{p}</option>)}</select>
          <select aria-label="Filtrar por responsable" className="input-field" value={filtroResponsable} onChange={(e) => setFiltroResponsable(e.target.value)}><option value="">Todos los responsables</option>{perfiles.map((p) => <option key={p.id} value={p.id}>{p.nombre_completo}</option>)}</select>
          <select aria-label="Filtrar por estado" className="input-field" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}><option value="">Todos los estados</option><option value="pendiente">Pendiente</option><option value="publicado">Publicado</option><option value="cancelado">Cancelado</option></select>
        </div>
        {error && <p role="alert" className="text-sm text-signal-urgent">{error}</p>}
      </div>

      {vista === "lista" ? <div className="space-y-2">
        {dias.map((day) => <div key={fechaLocal(day)} onDragOver={(e) => e.preventDefault()} onDrop={() => arrastrada && soltarEnDia(arrastrada, day)} className="card p-3 min-h-16">
          <h3 className="text-xs uppercase tracking-wide text-gray-500 mb-2">{day.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}</h3>
          <div className="flex flex-wrap gap-2">{publicacionesDelDia(day).map((pub) => <TarjetaPublicacion key={pub.id} pub={pub} marca={marcas.find((m) => m.id === pub.marca_id)} draggable={pub.estado === "pendiente"} onDragStart={() => setArrastrada(pub.id)} onClick={() => abrirEdicion(pub)} />)}</div>
        </div>)}
        {!filtradas.some((p) => dias.some((day) => fechaLocal(new Date(p.fecha_hora)) === fechaLocal(day))) && <div className="card p-8 text-center text-gray-500">No hay publicaciones en este periodo.</div>}
      </div> : <div className={vista === "mes" ? "grid grid-cols-7 gap-1 sm:gap-2" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2"}>
        {vista === "mes" && ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => <div key={d} className="hidden sm:block text-center text-[11px] uppercase text-gray-600 pb-1">{d}</div>)}
        {dias.map((day) => <div key={fechaLocal(day)} onDragOver={(e) => e.preventDefault()} onDrop={() => arrastrada && soltarEnDia(arrastrada, day)}
          className={`card p-1.5 sm:p-2 min-h-24 sm:min-h-32 ${vista === "mes" && day.getMonth() !== fecha.getMonth() ? "opacity-40" : ""}`}>
          <div className="flex justify-between items-center mb-1"><span className={`text-xs ${fechaLocal(day) === fechaLocal(new Date()) ? "text-accent-neon font-semibold" : "text-gray-500"}`}>{day.toLocaleDateString("es-MX", { weekday: vista === "semana" ? "short" : undefined, day: "numeric" })}</span>
            <button aria-label={`Programar para ${fechaLocal(day)}`} className="text-gray-600 hover:text-accent-soft text-xs" onClick={() => { setFecha(day); setSeleccionado(null); setModal(true); }}>+</button></div>
          <div className="space-y-1">{publicacionesDelDia(day).map((pub) => <TarjetaPublicacion key={pub.id} pub={pub} marca={marcas.find((m) => m.id === pub.marca_id)} draggable={pub.estado === "pendiente"} onDragStart={() => setArrastrada(pub.id)} onClick={() => abrirEdicion(pub)} compact={vista === "mes"} />)}</div>
        </div>)}
      </div>}

      {modal && <EditorPublicacion
        key={seleccionado?.id || `nueva-${fechaLocal(fecha)}`}
        publicacion={seleccionado}
        fechaBase={fecha}
        marcas={marcasActivas}
        perfiles={perfiles}
        guiones={guiones}
        guardar={guardar}
        eliminar={eliminar}
        cerrar={() => setModal(false)}
        error={error}
        ocupado={ocupado}
      />}
    </div>
  );
}

function TarjetaPublicacion({ pub, marca, draggable, onDragStart, onClick, compact = false }: {
  pub: Publicacion; marca?: Marca; draggable: boolean; onDragStart: () => void; onClick: () => void; compact?: boolean;
}) {
  const hora = new Date(pub.fecha_hora).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  return <button type="button" draggable={draggable} onDragStart={onDragStart} onClick={onClick}
    title={`${hora} · ${marca?.nombre || "Marca"} · ${pub.plataforma}`}
    className={`w-full text-left rounded-md px-1.5 py-1 text-[10px] sm:text-xs truncate border-l-2 ${compact ? "" : "sm:py-1.5"} ${pub.estado === "publicado" ? "opacity-60" : ""}`}
    style={{ backgroundColor: `${marca?.color || "#3AA7A1"}22`, borderColor: marca?.color || "#3AA7A1" }}>
    <span className="font-mono">{hora}</span>{!compact && <span className="hidden sm:inline"> · {marca?.nombre} · </span>}<span>{pub.plataforma}</span>{pub.estado === "publicado" && " ✓"}
  </button>;
}

function EditorPublicacion({ publicacion, fechaBase, marcas, perfiles, guiones, guardar, eliminar, cerrar, error, ocupado }: {
  publicacion: Publicacion | null; fechaBase: Date; marcas: Marca[]; perfiles: PerfilOpcion[];
  guiones: GuionOpcion[]; guardar: (form: FormData) => void; eliminar: () => void;
  cerrar: () => void; error: string; ocupado: boolean;
}) {
  const [marcaId, setMarcaId] = useState(publicacion?.marca_id || marcas[0]?.id || "");
  const marca = marcas.find((m) => m.id === marcaId);
  const opcionesGuion = guiones.filter((g) => g.marca_id === marcaId);
  const [plataforma, setPlataforma] = useState(publicacion?.plataforma || marca?.plataformas_activas[0] || "");
  const [guionId, setGuionId] = useState(publicacion?.guion_id || "");
  const fechaInicial = publicacion ? datetimeLocal(publicacion.fecha_hora) : `${fechaLocal(fechaBase)}T12:00`;
  return <div className="fixed inset-0 z-50 bg-base-950/80 flex items-center justify-center p-3" onMouseDown={(e) => { if (e.target === e.currentTarget) cerrar(); }}>
    <form action={guardar} className="card w-full max-w-2xl p-5 space-y-4 max-h-[94vh] overflow-y-auto">
      <div className="flex justify-between"><h3 className="font-display text-lg font-semibold">{publicacion ? "Editar publicación" : "Programar publicación"}</h3><button type="button" className="btn-ghost" onClick={cerrar}>Cerrar</button></div>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="text-sm text-gray-400">Marca<select name="marca_id" required value={marcaId} onChange={(e) => { const nextId = e.target.value; setMarcaId(nextId); setPlataforma(marcas.find((m) => m.id === nextId)?.plataformas_activas[0] || ""); setGuionId(""); }} className="input-field mt-1">{marcas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select></label>
        <label className="text-sm text-gray-400">Plataforma<select name="plataforma" required value={plataforma} onChange={(e) => setPlataforma(e.target.value)} className="input-field mt-1">{marca?.plataformas_activas.map((p) => <option key={p}>{p}</option>)}</select></label>
        <label className="text-sm text-gray-400">Fecha y hora<input name="fecha_hora" type="datetime-local" required defaultValue={fechaInicial} className="input-field mt-1" /></label>
        <label className="text-sm text-gray-400">Responsable de publicación<select name="responsable_id" defaultValue={publicacion?.responsable_id || ""} className="input-field mt-1"><option value="">Sin asignar</option>{perfiles.map((p) => <option key={p.id} value={p.id}>{p.nombre_completo}</option>)}</select></label>
        <label className="text-sm text-gray-400">Guion (opcional)<select name="guion_id" value={guionId} onChange={(e) => setGuionId(e.target.value)} className="input-field mt-1"><option value="">Sin guion</option>{opcionesGuion.map((g) => <option key={g.id} value={g.id}>{g.titulo}</option>)}</select></label>
        <label className="text-sm text-gray-400">Estado<select name="estado" defaultValue={publicacion?.estado || "pendiente"} className="input-field mt-1"><option value="pendiente">Pendiente</option><option value="publicado">Publicado</option><option value="cancelado">Cancelado</option></select></label>
      </div>
      <label className="block text-sm text-gray-400">Caption<textarea name="caption" rows={4} defaultValue={publicacion?.caption} className="input-field mt-1" /></label>
      <label className="block text-sm text-gray-400">Hashtags<textarea name="hashtags" rows={2} placeholder="#marca #tema" defaultValue={publicacion?.hashtags.map((h) => `#${h}`).join(" ")} className="input-field mt-1" /></label>
      <div className="grid sm:grid-cols-3 gap-3">
        <label className="text-sm text-gray-400">Video<input name="video_url" type="url" defaultValue={publicacion?.video_url || ""} className="input-field mt-1" placeholder="https://" /></label>
        <label className="text-sm text-gray-400">Descarga<input name="descarga_url" type="url" defaultValue={publicacion?.descarga_url || ""} className="input-field mt-1" placeholder="https://" /></label>
        <label className="text-sm text-gray-400">Publicación final<input name="publicacion_url" type="url" defaultValue={publicacion?.publicacion_url || ""} className="input-field mt-1" placeholder="https://" /></label>
      </div>
      {error && <p role="alert" className="text-sm text-signal-urgent">{error}</p>}
      <div className="flex flex-wrap justify-between gap-2 border-t border-base-700 pt-3">
        {publicacion ? <button type="button" className="btn-ghost text-signal-urgent" onClick={eliminar}>Eliminar publicación</button> : <span />}
        <div className="flex gap-2"><button type="button" className="btn-ghost" onClick={cerrar}>Cancelar</button><button disabled={ocupado || !marcas.length} className="btn-primary">{ocupado ? "Guardando…" : "Guardar"}</button></div>
      </div>
    </form>
  </div>;
}
