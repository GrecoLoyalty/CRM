"use client";

import { useState } from "react";
import { marcarPublicacion } from "@/app/dashboard/marketing/actions";

type PublicacionAsignada = {
  id: string; marca_id: string; plataforma: string; fecha_hora: string;
  caption: string; hashtags: string[]; video_url: string | null;
  descarga_url: string | null; publicacion_url: string | null;
};
type Marca = { id: string; nombre: string; color: string };

function claveFecha(value: string) {
  const d = new Date(value);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
function inicioSemana(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

export default function ParaPublicarPanel({ publicaciones, marcas }: { publicaciones: PublicacionAsignada[]; marcas: Marca[] }) {
  const [error, setError] = useState("");
  const [completando, setCompletando] = useState("");
  const hoy = new Date();
  const inicio = inicioSemana(hoy);
  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + 7);
  const hoyKey = claveFecha(hoy.toISOString());
  const semana = publicaciones.filter((p) => {
    const date = new Date(p.fecha_hora);
    return date >= inicio && date < fin;
  }).sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora));
  const hoyPublicaciones = semana.filter((p) => claveFecha(p.fecha_hora) === hoyKey);
  const restoSemana = semana.filter((p) => claveFecha(p.fecha_hora) !== hoyKey);

  async function copiar(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setError("");
    } catch {
      setError(`No se pudo copiar ${label}. Revisa los permisos del navegador.`);
    }
  }
  async function publicar(item: PublicacionAsignada, form: FormData) {
    setCompletando(item.id);
    setError("");
    try {
      await marcarPublicacion(item.id, String(form.get("publicacion_url") || ""));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo actualizar la publicación.");
    } finally {
      setCompletando("");
    }
  }

  return <div className="max-w-4xl mx-auto space-y-5">
    <header>
      <p className="text-xs uppercase tracking-[0.14em] text-accent-soft">Contenido asignado</p>
      <h2 className="text-2xl font-display font-semibold mt-1">Para publicar</h2>
      <p className="text-sm text-gray-500 mt-1">Accede al material, copia el texto y marca cada publicación al terminar.</p>
    </header>
    {error && <p role="alert" className="rounded-lg border border-signal-urgent/30 bg-signal-urgent/10 px-3 py-2 text-sm text-signal-urgent">{error}</p>}
    <SeccionPublicar titulo="Hoy" publicaciones={hoyPublicaciones} marcas={marcas} publicar={publicar} completando={completando} copiar={copiar} />
    <SeccionPublicar titulo="Esta semana" publicaciones={restoSemana} marcas={marcas} publicar={publicar} completando={completando} copiar={copiar} />
    {!semana.length && <div className="card p-8 text-center"><p className="font-medium text-gray-300">No tienes pendientes para esta semana.</p><p className="text-sm text-gray-500 mt-1">Cuando te asignen contenido aparecerá aquí.</p></div>}
  </div>;
}

function SeccionPublicar({ titulo, publicaciones, marcas, publicar, completando, copiar }: {
  titulo: string; publicaciones: PublicacionAsignada[]; marcas: Marca[];
  publicar: (item: PublicacionAsignada, form: FormData) => void;
  completando: string; copiar: (text: string, label: string) => void;
}) {
  return <section className="space-y-3">
    <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400">{titulo}<span className="ml-2 text-gray-600">{publicaciones.length}</span></h3>
    {publicaciones.length === 0 ? <div className="card p-4 text-sm text-gray-600">Sin pendientes.</div> : publicaciones.map((item) => {
      const marca = marcas.find((m) => m.id === item.marca_id);
      const captionCompleto = [item.caption, item.hashtags.map((h) => `#${h}`).join(" ")].filter(Boolean).join("\n\n");
      return <article key={item.id} className="card p-4 sm:p-5 space-y-4">
        <div className="flex items-start gap-3">
          <span className="w-1.5 self-stretch rounded-full shrink-0" style={{ backgroundColor: marca?.color || "#3AA7A1" }} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-semibold text-gray-100">{marca?.nombre || "Marca"}</h4>
              <span className="badge">{item.plataforma}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{new Date(item.fecha_hora).toLocaleString("es-MX", { weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
          </div>
        </div>
        {item.caption && <p className="text-sm text-gray-300 whitespace-pre-wrap break-words">{item.caption}</p>}
        {item.hashtags.length > 0 && <p className="text-sm text-accent-soft break-words">{item.hashtags.map((h) => `#${h}`).join(" ")}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {item.video_url ? <a href={item.video_url} target="_blank" rel="noopener noreferrer" className="btn-secondary justify-center">Abrir video</a> : <span className="btn-secondary justify-center opacity-40 pointer-events-none">Video no agregado</span>}
          {item.descarga_url ? <a href={item.descarga_url} target="_blank" rel="noopener noreferrer" className="btn-secondary justify-center">Descargar video ↗</a> : <span className="btn-secondary justify-center opacity-40 pointer-events-none">Descarga no agregada</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost flex-1 min-w-36" onClick={() => copiar(item.caption, "el caption")}>Copiar caption</button>
          <button className="btn-ghost flex-1 min-w-36" onClick={() => copiar(item.hashtags.map((h) => `#${h}`).join(" "), "los hashtags")}>Copiar hashtags</button>
          <button className="btn-ghost flex-1 min-w-36" onClick={() => copiar(captionCompleto, "el texto completo")}>Copiar todo</button>
        </div>
        <form action={(form) => publicar(item, form)} className="flex flex-col sm:flex-row gap-2 border-t border-base-700 pt-3">
          <input name="publicacion_url" type="url" defaultValue={item.publicacion_url || ""} placeholder="Link final al publicar (opcional)" className="input-field flex-1 min-w-0" />
          <button disabled={completando === item.id} className="btn-primary justify-center shrink-0">
            {completando === item.id ? "Guardando…" : "Marcar publicado"}
          </button>
        </form>
      </article>;
    })}
  </section>;
}
