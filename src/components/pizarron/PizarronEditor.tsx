"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";
import {
  COLORES_IDEA,
  type ConexionPizarron,
  type ElementoPizarron,
  type Pizarron,
} from "@/lib/pizarron";
import {
  crearPizarron,
  eliminarPizarron,
  enviarPizarronPorCorreo,
  guardarPizarron,
} from "@/app/dashboard/pizarron/actions";

type Props = {
  pizarrones: Pizarron[];
  userId: string;
  puedeAdministrar: boolean;
};

export default function PizarronEditor({ pizarrones: iniciales, userId, puedeAdministrar }: Props) {
  const [pizarrones, setPizarrones] = useState(iniciales);
  const [activoId, setActivoId] = useState(iniciales[0]?.id || "");
  const [conectar, setConectar] = useState(false);
  const [origenConexion, setOrigenConexion] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [correo, setCorreo] = useState("");
  const [mostrarCorreo, setMostrarCorreo] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const pizarron = pizarrones.find((item) => item.id === activoId);
  const editable = !!pizarron && (pizarron.creado_por === userId || puedeAdministrar);

  function actualizarActivo(cambios: Partial<Pizarron>) {
    setPizarrones((actuales) =>
      actuales.map((item) => (item.id === activoId ? { ...item, ...cambios } : item))
    );
  }

  async function nuevoPizarron() {
    setOcupado(true);
    setMensaje("");
    const resultado = await crearPizarron();
    setOcupado(false);
    if (!resultado.id) {
      setMensaje(resultado.error || "No se pudo crear el pizarrón.");
      return;
    }
    setPizarrones((actuales) => [
      {
        id: resultado.id!,
        titulo: "Nuevo pizarrón",
        elementos: [],
        conexiones: [],
        creado_por: userId,
        updated_at: new Date().toISOString(),
      },
      ...actuales,
    ]);
    setActivoId(resultado.id);
    setMostrarCorreo(false);
    setMensaje("");
  }

  function agregarElemento(tipo: ElementoPizarron["tipo"]) {
    if (!pizarron || !editable) return;
    const elemento: ElementoPizarron = {
      id: crypto.randomUUID(),
      tipo,
      texto: tipo === "idea" ? "Nueva idea" : "Escribe aquí…",
      x: 8 + (pizarron.elementos.length % 4) * 21,
      y: 12 + (Math.floor(pizarron.elementos.length / 4) % 5) * 15,
      color: tipo === "idea" ? COLORES_IDEA[pizarron.elementos.length % COLORES_IDEA.length] : "#93A4B8",
    };
    actualizarActivo({ elementos: [...pizarron.elementos, elemento] });
    setMensaje("Cambios sin guardar.");
  }

  function actualizarElemento(id: string, cambios: Partial<ElementoPizarron>) {
    if (!pizarron || !editable) return;
    actualizarActivo({
      elementos: pizarron.elementos.map((elemento) =>
        elemento.id === id ? { ...elemento, ...cambios } : elemento
      ),
    });
    setMensaje("Cambios sin guardar.");
  }

  function seleccionarElemento(id: string) {
    if (!conectar || !pizarron || !editable) return;
    if (!origenConexion) {
      setOrigenConexion(id);
      setMensaje("Selecciona la idea de destino.");
      return;
    }
    if (origenConexion !== id) {
      const existe = pizarron.conexiones.some(
        (conexion) =>
          (conexion.desde === origenConexion && conexion.hacia === id) ||
          (conexion.desde === id && conexion.hacia === origenConexion)
      );
      if (!existe) {
        const nueva: ConexionPizarron = {
          id: crypto.randomUUID(),
          desde: origenConexion,
          hacia: id,
        };
        actualizarActivo({ conexiones: [...pizarron.conexiones, nueva] });
        setMensaje("Cambios sin guardar.");
      }
    }
    setOrigenConexion(null);
    setConectar(false);
  }

  function moverElemento(event: React.PointerEvent<HTMLDivElement>) {
    if (!arrastrando || !pizarron || !editable) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(82, ((event.clientX - bounds.left) / bounds.width) * 100));
    const y = Math.max(0, Math.min(88, ((event.clientY - bounds.top) / bounds.height) * 100));
    actualizarActivo({
      elementos: pizarron.elementos.map((elemento) =>
        elemento.id === arrastrando ? { ...elemento, x, y } : elemento
      ),
    });
    setMensaje("Cambios sin guardar.");
  }

  async function guardarActual() {
    if (!pizarron || !editable) return false;
    setOcupado(true);
    setMensaje("");
    const resultado = await guardarPizarron(
      pizarron.id,
      pizarron.titulo,
      pizarron.elementos,
      pizarron.conexiones
    );
    setOcupado(false);
    if (resultado.error) {
      setMensaje(resultado.error);
      return false;
    }
    setMensaje("Pizarrón guardado.");
    return true;
  }

  async function descargarPDF() {
    if (!pizarron) return;
    if (editable && !(await guardarActual())) return;
    setOcupado(true);
    setMensaje("");
    try {
      const response = await fetch(`/api/pizarrones/${pizarron.id}/pdf`);
      if (!response.ok) {
        const resultado = await response.json();
        throw new Error(resultado.error || "No se pudo descargar el PDF.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = `${pizarron.titulo.replace(/[^\w-]+/g, "-")}.pdf`;
      enlace.click();
      URL.revokeObjectURL(url);
      setMensaje("PDF descargado.");
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : "No se pudo descargar el PDF.");
    }
    setOcupado(false);
  }

  async function enviarCorreo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pizarron) return;
    if (editable && !(await guardarActual())) return;
    setOcupado(true);
    const resultado = await enviarPizarronPorCorreo(pizarron.id, correo);
    setOcupado(false);
    setMensaje(resultado.error || "Pizarrón enviado por correo.");
    if (!resultado.error) {
      setCorreo("");
      setMostrarCorreo(false);
    }
  }

  async function borrarActual() {
    if (!pizarron || !editable || !window.confirm("¿Eliminar este pizarrón? Esta acción no se puede deshacer.")) return;
    setOcupado(true);
    const resultado = await eliminarPizarron(pizarron.id);
    setOcupado(false);
    if (resultado.error) {
      setMensaje(resultado.error);
      return;
    }
    const siguientes = pizarrones.filter((item) => item.id !== pizarron.id);
    setPizarrones(siguientes);
    setActivoId(siguientes[0]?.id || "");
    setMensaje("");
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-semibold">Pizarrón de ideas</h2>
          <p className="mt-1 text-sm text-gray-500">
            Crea mapas de ideas, agrega notas y conecta conceptos con tu equipo.
          </p>
        </div>
        <button className="btn-primary" onClick={nuevoPizarron} disabled={ocupado}>
          <Icon name="mas" className="h-4 w-4" />
          Nuevo pizarrón
        </button>
      </header>

      {pizarrones.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {pizarrones.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActivoId(item.id);
                setMostrarCorreo(false);
                setMensaje("");
              }}
              className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                item.id === activoId
                  ? "border-accent/50 bg-accent/10 text-accent-soft"
                  : "border-base-600 bg-base-800 text-gray-400 hover:text-gray-100"
              }`}
            >
              {item.titulo}
            </button>
          ))}
        </div>
      )}

      {!pizarron ? (
        <div className="card p-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent-soft">
            <Icon name="pizarron" className="h-7 w-7" />
          </div>
          <h3 className="font-display text-lg font-semibold">Empieza con un pizarrón en blanco</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
            Agrega ideas, texto y relaciones para organizar visualmente cualquier tema.
          </p>
        </div>
      ) : (
        <>
          <div className="card flex flex-wrap items-center gap-2 p-3">
            <input
              className="input-field min-w-[200px] flex-1 font-display text-base font-semibold"
              aria-label="Título del pizarrón"
              maxLength={100}
              value={pizarron.titulo}
              disabled={!editable}
              onChange={(event) => {
                actualizarActivo({ titulo: event.target.value });
                setMensaje("Cambios sin guardar.");
              }}
            />
            {editable && (
              <>
                <button className="btn-secondary" onClick={() => agregarElemento("idea")}>
                  <Icon name="mas" className="h-4 w-4" /> Idea
                </button>
                <button className="btn-secondary" onClick={() => agregarElemento("texto")}>
                  <Icon name="mas" className="h-4 w-4" /> Texto
                </button>
                <button
                  className={`btn-secondary ${conectar ? "border-accent/60 text-accent-soft" : ""}`}
                  onClick={() => {
                    setConectar((actual) => !actual);
                    setOrigenConexion(null);
                    setMensaje(conectar ? "" : "Selecciona dos elementos para conectarlos.");
                  }}
                >
                  Conectar
                </button>
                <button
                  className="btn-primary"
                  onClick={guardarActual}
                  disabled={ocupado || pizarron.titulo.trim().length === 0}
                >
                  Guardar
                </button>
              </>
            )}
            <button className="btn-secondary" onClick={descargarPDF} disabled={ocupado}>
              Descargar PDF
            </button>
            <button
              className="btn-secondary"
              onClick={() => setMostrarCorreo((actual) => !actual)}
              disabled={ocupado}
            >
              Enviar por correo
            </button>
            {editable && (
              <button className="btn-icon text-signal-urgent" onClick={borrarActual} disabled={ocupado} aria-label="Eliminar pizarrón">
                <Icon name="cerrar" className="h-4 w-4" />
              </button>
            )}
          </div>

          {mostrarCorreo && (
            <form onSubmit={enviarCorreo} className="card flex flex-wrap items-end gap-3 p-4">
              <label className="min-w-[220px] flex-1">
                <span className="label-field">Enviar contenido a</span>
                <input
                  className="input-field"
                  type="email"
                  required
                  maxLength={320}
                  placeholder="nombre@correo.com"
                  value={correo}
                  onChange={(event) => setCorreo(event.target.value)}
                />
              </label>
              <button type="submit" className="btn-primary" disabled={ocupado}>
                Enviar pizarrón
              </button>
            </form>
          )}

          {mensaje && (
            <p role="status" className={`text-sm ${mensaje.toLowerCase().includes("no ") || mensaje.includes("válid") || mensaje.includes("permiso") ? "text-signal-urgent" : "text-gray-400"}`}>
              {mensaje}
            </p>
          )}

          {!editable && (
            <p className="text-sm text-gray-500">Este pizarrón es de otra persona. Puedes revisarlo, enviarlo o descargarlo.</p>
          )}

          <div className="overflow-x-auto rounded-xl border border-base-600">
            <div
              className={`relative h-[620px] min-w-[850px] overflow-hidden bg-base-850 ${
                conectar && editable ? "cursor-crosshair" : ""
              }`}
              onPointerMove={moverElemento}
              onPointerUp={() => setArrastrando(null)}
              onPointerCancel={() => setArrastrando(null)}
              style={{
                backgroundImage: "radial-gradient(#34415b 1px, transparent 1px)",
                backgroundSize: "22px 22px",
              }}
            >
            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1000 650" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <marker id="pizarron-flecha" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L6,3 z" fill="#6f849e" />
                </marker>
              </defs>
              {pizarron.conexiones.map((conexion) => {
                const desde = pizarron.elementos.find((elemento) => elemento.id === conexion.desde);
                const hacia = pizarron.elementos.find((elemento) => elemento.id === conexion.hacia);
                if (!desde || !hacia) return null;
                return (
                  <line
                    key={conexion.id}
                    x1={desde.x * 10 + 90}
                    y1={desde.y * 6.5 + 46}
                    x2={hacia.x * 10 + 90}
                    y2={hacia.y * 6.5 + 46}
                    stroke="#6f849e"
                    strokeWidth="2"
                    markerEnd="url(#pizarron-flecha)"
                  />
                );
              })}
            </svg>

            {pizarron.elementos.map((elemento) => (
              <div
                key={elemento.id}
                className={`absolute w-[190px] rounded-xl border p-3 shadow-lg ${
                  elemento.tipo === "idea" ? "text-gray-950" : "bg-base-800/95 text-gray-100"
                } ${conectar && editable ? "cursor-crosshair ring-2 ring-accent/30" : editable ? "cursor-grab active:cursor-grabbing" : ""} ${
                  origenConexion === elemento.id ? "ring-2 ring-accent" : ""
                }`}
                style={{
                  left: `${elemento.x}%`,
                  top: `${elemento.y}%`,
                  backgroundColor: elemento.tipo === "idea" ? elemento.color : undefined,
                  borderColor: elemento.tipo === "idea" ? `${elemento.color}aa` : "#34415b",
                  touchAction: "none",
                }}
                onPointerDown={(event) => {
                  if (!editable || conectar || (event.target as HTMLElement).closest("textarea,button")) return;
                  event.currentTarget.setPointerCapture(event.pointerId);
                  setArrastrando(elemento.id);
                }}
                onPointerUp={() => setArrastrando(null)}
                onClick={() => seleccionarElemento(elemento.id)}
                onKeyDown={(event) => {
                  if (
                    conectar &&
                    editable &&
                    event.target === event.currentTarget &&
                    (event.key === "Enter" || event.key === " ")
                  ) {
                    event.preventDefault();
                    seleccionarElemento(elemento.id);
                  }
                }}
                role={conectar && editable ? "button" : undefined}
                tabIndex={conectar && editable ? 0 : undefined}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${elemento.tipo === "idea" ? "text-gray-800/70" : "text-gray-500"}`}>
                    {elemento.tipo === "idea" ? "Idea" : "Texto"}
                  </span>
                  {editable && (
                    <button
                      className={`rounded px-1 text-xs ${elemento.tipo === "idea" ? "text-gray-800/70 hover:text-gray-950" : "text-gray-500 hover:text-white"}`}
                      aria-label="Eliminar elemento"
                      onClick={() => {
                        actualizarActivo({
                          elementos: pizarron.elementos.filter((item) => item.id !== elemento.id),
                          conexiones: pizarron.conexiones.filter(
                            (item) => item.desde !== elemento.id && item.hacia !== elemento.id
                          ),
                        });
                        setMensaje("Cambios sin guardar.");
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
                <textarea
                  aria-label={`Contenido de ${elemento.tipo}`}
                  className={`min-h-[64px] w-full resize-none bg-transparent text-sm leading-relaxed outline-none ${
                    elemento.tipo === "idea" ? "font-semibold text-gray-950 placeholder:text-gray-700" : "text-gray-100 placeholder:text-gray-600"
                  }`}
                  value={elemento.texto}
                  disabled={!editable}
                  maxLength={2000}
                  onChange={(event) => actualizarElemento(elemento.id, { texto: event.target.value })}
                  onClick={(event) => event.stopPropagation()}
                  placeholder="Escribe tu idea…"
                />
              </div>
            ))}
            {pizarron.elementos.length === 0 && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-gray-600">
                Agrega una idea o texto para comenzar
              </div>
            )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
