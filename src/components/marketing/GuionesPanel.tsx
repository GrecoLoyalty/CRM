"use client";

import { useState } from "react";
import { duplicarGuion, eliminarGuion, guardarGuion } from "@/app/dashboard/marketing/actions";

type Escena = { visual: string; audio: string; texto_pantalla: string };
type Guion = {
  id: string; marca_id: string; titulo: string; plataforma: string; formato: string;
  duracion_segundos: number | null; gancho: string; llamado_accion: string;
  notas_grabacion: string; estado: "borrador" | "en_revision" | "aprobado" | "grabado";
  guion_escenas: (Escena & { id: string; orden: number })[];
};
type Marca = { id: string; nombre: string; color: string; plataformas_activas: string[]; activa: boolean };
const ESTADOS = ["borrador", "en_revision", "aprobado", "grabado"] as const;

export default function GuionesPanel({ guiones, marcas }: { guiones: Guion[]; marcas: Marca[] }) {
  const [seleccionado, setSeleccionado] = useState<Guion | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [filtroMarca, setFiltroMarca] = useState("");
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);

  function nuevo() {
    setSeleccionado(null);
    setAbierto(true);
    setError("");
  }
  function editar(guion: Guion) {
    setSeleccionado(guion);
    setAbierto(true);
    setError("");
  }
  async function guardar(form: FormData) {
    const escenas: Escena[] = [];
    for (let i = 0; i < Number(form.get("escenas_count") || 0); i++) {
      escenas.push({
        visual: String(form.get(`visual-${i}`) || ""),
        audio: String(form.get(`audio-${i}`) || ""),
        texto_pantalla: String(form.get(`texto-${i}`) || ""),
      });
    }
    setOcupado(true);
    setError("");
    try {
      await guardarGuion({
        id: seleccionado?.id,
        marca_id: String(form.get("marca_id")),
        titulo: String(form.get("titulo")),
        plataforma: String(form.get("plataforma")),
        formato: String(form.get("formato")),
        duracion_segundos: form.get("duracion") ? Number(form.get("duracion")) : null,
        gancho: String(form.get("gancho") || ""),
        llamado_accion: String(form.get("llamado_accion") || ""),
        notas_grabacion: String(form.get("notas") || ""),
        estado: String(form.get("estado")) as Guion["estado"],
        escenas,
      });
      setAbierto(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el guion.");
    } finally {
      setOcupado(false);
    }
  }
  async function duplicar(guion: Guion) {
    setError("");
    try { await duplicarGuion(guion.id); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo duplicar el guion."); }
  }
  async function borrar(guion: Guion) {
    if (!window.confirm(`¿Eliminar el guion “${guion.titulo}”?`)) return;
    setError("");
    try { await eliminarGuion(guion.id); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo eliminar el guion."); }
  }
  function exportar(guion: Guion) {
    const marca = marcas.find((m) => m.id === guion.marca_id)?.nombre || "";
    const escenas = [...guion.guion_escenas].sort((a, b) => a.orden - b.orden)
      .map((escena, i) => `Escena ${i + 1}\nVisual: ${escena.visual}\nAudio: ${escena.audio}\nTexto en pantalla: ${escena.texto_pantalla}`).join("\n\n");
    const texto = `${guion.titulo}\nMarca: ${marca}\nPlataforma: ${guion.plataforma} · ${guion.formato}\nDuración: ${guion.duracion_segundos ?? "—"} segundos\nEstado: ${guion.estado}\n\nGancho\n${guion.gancho}\n\n${escenas}\n\nLlamado a la acción\n${guion.llamado_accion}\n\nNotas de grabación\n${guion.notas_grabacion}`;
    const url = URL.createObjectURL(new Blob([texto], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${guion.titulo.replace(/[^\p{L}\p{N}-]+/gu, "-")}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const listado = guiones.filter((g) => !filtroMarca || g.marca_id === filtroMarca);
  const marcasActivas = marcas.filter((m) => m.activa);
  const marcaFormulario = seleccionado?.marca_id || marcasActivas[0]?.id || "";
  const plataformas = marcas.find((m) => m.id === marcaFormulario)?.plataformas_activas || [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="text-xl font-display font-semibold">Guiones</h2><p className="text-sm text-gray-500 mt-1">Escribe, revisa y prepara guiones por marca.</p></div>
        <div className="flex gap-2">
          <select aria-label="Filtrar por marca" value={filtroMarca} onChange={(e) => setFiltroMarca(e.target.value)} className="input-field w-auto">
            <option value="">Todas las marcas</option>{marcas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
          <button className="btn-primary" onClick={nuevo} disabled={!marcasActivas.length}>Nuevo guion</button>
        </div>
      </div>
      {error && <p role="alert" className="text-sm text-signal-urgent">{error}</p>}
      <div className="grid gap-3 lg:grid-cols-2">
        {listado.map((guion) => {
          const marca = marcas.find((m) => m.id === guion.marca_id);
          return <article key={guion.id} className="card p-4 space-y-3">
            <div className="flex items-start gap-3">
              <span className="w-2 h-10 rounded-full shrink-0" style={{ backgroundColor: marca?.color || "#3AA7A1" }} />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500">{marca?.nombre || "Marca"} · {guion.plataforma} · {guion.formato}</p>
                <h3 className="font-semibold text-gray-100 break-words">{guion.titulo}</h3>
                <span className="badge mt-2">{guion.estado.replace("_", " ")}</span>
              </div>
              <span className="text-xs text-gray-500">{guion.duracion_segundos ? `${guion.duracion_segundos}s` : "—"}</span>
            </div>
            <p className="text-sm text-gray-400 line-clamp-2">{guion.gancho || "Sin gancho agregado."}</p>
            <div className="flex flex-wrap gap-2 border-t border-base-700 pt-3">
              <button className="btn-secondary" onClick={() => editar(guion)}>Editar</button>
              <button className="btn-ghost" onClick={() => duplicar(guion)}>Duplicar</button>
              <button className="btn-ghost" onClick={() => exportar(guion)}>Exportar</button>
              <button className="btn-ghost" onClick={() => { editar(guion); window.setTimeout(() => window.print(), 100); }}>Imprimir</button>
              <button className="btn-ghost text-signal-urgent" onClick={() => borrar(guion)}>Eliminar</button>
            </div>
          </article>;
        })}
      </div>
      {listado.length === 0 && <div className="card p-8 text-center text-gray-500">No hay guiones para este filtro.</div>}

      {abierto && <EditorGuion
        key={seleccionado?.id || "nuevo"}
        guion={seleccionado}
        marcas={marcasActivas}
        plataformas={plataformas}
        guardar={guardar}
        cerrar={() => setAbierto(false)}
        error={error}
        ocupado={ocupado}
      />}
    </div>
  );
}

function EditorGuion({ guion, marcas, plataformas, guardar, cerrar, error, ocupado }: {
  guion: Guion | null; marcas: Marca[]; plataformas: string[];
  guardar: (form: FormData) => void; cerrar: () => void; error: string; ocupado: boolean;
}) {
  const [marcaId, setMarcaId] = useState(guion?.marca_id || marcas[0]?.id || "");
  const [escenas, setEscenas] = useState<Escena[]>(() => guion
    ? [...guion.guion_escenas].sort((a, b) => a.orden - b.orden).map(({ visual, audio, texto_pantalla }) => ({ visual, audio, texto_pantalla }))
    : [{ visual: "", audio: "", texto_pantalla: "" }]);
  const plataformasMarca = marcas.find((m) => m.id === marcaId)?.plataformas_activas || plataformas;
  const [plataforma, setPlataforma] = useState(guion?.plataforma || plataformasMarca[0] || "");
  function actualizarEscena(index: number, campo: keyof Escena, value: string) {
    setEscenas((previas) => previas.map((escena, i) => i === index ? { ...escena, [campo]: value } : escena));
  }
  return <div className="fixed inset-0 z-50 bg-base-950/80 flex items-center justify-center p-3 print:static print:bg-transparent print:p-0">
    <form action={guardar} className="marketing-guion-print card w-full max-w-3xl p-5 space-y-4 max-h-[94vh] overflow-y-auto print:max-h-none print:overflow-visible">
      <div className="flex justify-between gap-3"><h3 className="font-display text-lg font-semibold">{guion ? "Editar guion" : "Crear guion"}</h3><button type="button" className="btn-ghost marketing-print-hide" onClick={cerrar}>Cerrar</button></div>
      <input type="hidden" name="escenas_count" value={escenas.length} />
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="text-sm text-gray-400">Marca<select name="marca_id" required value={marcaId} onChange={(e) => { const nextId = e.target.value; setMarcaId(nextId); setPlataforma(marcas.find((m) => m.id === nextId)?.plataformas_activas[0] || ""); }} className="input-field mt-1">{marcas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select></label>
        <label className="text-sm text-gray-400">Título<input name="titulo" required maxLength={200} defaultValue={guion?.titulo} className="input-field mt-1" /></label>
        <label className="text-sm text-gray-400">Plataforma<select name="plataforma" required value={plataforma} onChange={(e) => setPlataforma(e.target.value)} className="input-field mt-1">{plataformasMarca.map((p) => <option key={p}>{p}</option>)}</select></label>
        <label className="text-sm text-gray-400">Formato<input name="formato" required placeholder="Reel, historia, carrusel…" defaultValue={guion?.formato} className="input-field mt-1" /></label>
        <label className="text-sm text-gray-400">Duración (segundos)<input name="duracion" type="number" min="0" defaultValue={guion?.duracion_segundos ?? ""} className="input-field mt-1" /></label>
        <label className="text-sm text-gray-400">Estado<select name="estado" defaultValue={guion?.estado || "borrador"} className="input-field mt-1">{ESTADOS.map((e) => <option key={e} value={e}>{e.replace("_", " ")}</option>)}</select></label>
      </div>
      <label className="block text-sm text-gray-400">Gancho<textarea name="gancho" rows={2} defaultValue={guion?.gancho} className="input-field mt-1" /></label>
      <fieldset className="space-y-3"><legend className="text-sm font-medium text-gray-300">Escenas</legend>
        {escenas.map((escena, i) => <div key={i} className="rounded-lg border border-base-600 p-3 space-y-2">
          <div className="flex justify-between"><span className="text-xs text-gray-500">Escena {i + 1}</span>{escenas.length > 1 && <button type="button" className="text-xs text-signal-urgent marketing-print-hide" onClick={() => setEscenas(escenas.filter((_, ix) => ix !== i))}>Quitar escena</button>}</div>
          <textarea name={`visual-${i}`} rows={2} placeholder="Visual / acción" value={escena.visual} onChange={(e) => actualizarEscena(i, "visual", e.target.value)} className="input-field" />
          <textarea name={`audio-${i}`} rows={2} placeholder="Audio / diálogo" value={escena.audio} onChange={(e) => actualizarEscena(i, "audio", e.target.value)} className="input-field" />
          <textarea name={`texto-${i}`} rows={2} placeholder="Texto en pantalla" value={escena.texto_pantalla} onChange={(e) => actualizarEscena(i, "texto_pantalla", e.target.value)} className="input-field" />
        </div>)}
        <button type="button" className="btn-secondary marketing-print-hide" onClick={() => setEscenas([...escenas, { visual: "", audio: "", texto_pantalla: "" }])}>Añadir escena</button>
      </fieldset>
      <label className="block text-sm text-gray-400">Llamado a la acción<textarea name="llamado_accion" rows={2} defaultValue={guion?.llamado_accion} className="input-field mt-1" /></label>
      <label className="block text-sm text-gray-400">Notas de grabación<textarea name="notas" rows={3} defaultValue={guion?.notas_grabacion} className="input-field mt-1" /></label>
      {error && <p role="alert" className="text-sm text-signal-urgent">{error}</p>}
      <div className="flex justify-end gap-2 marketing-print-hide"><button type="button" className="btn-ghost" onClick={cerrar}>Cancelar</button><button disabled={ocupado || !marcas.length} className="btn-primary">{ocupado ? "Guardando…" : "Guardar guion"}</button></div>
    </form>
  </div>;
}
