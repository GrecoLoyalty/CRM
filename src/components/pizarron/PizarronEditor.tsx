"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/ui/Icon";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import {
  ALTO_INICIAL_PIZARRON,
  ALTO_MAX_PIZARRON,
  ALTO_MIN_PIZARRON,
  ANCHO_INICIAL_PIZARRON,
  ANCHO_MAX_PIZARRON,
  ANCHO_MIN_PIZARRON,
  COLORES_IDEA,
  altoDeElemento,
  anchoDeElemento,
  type ConexionPizarron,
  type ElementoPizarron,
  type Pizarron,
} from "@/lib/pizarron";
import {
  crearPizarron,
  crearEnlaceInvitacion,
  clonarPizarron,
  eliminarPizarron,
  enviarPizarronPorCorreo,
  guardarPizarron,
  quitarPizarronCompartido,
  revocarEnlaceInvitacion,
} from "@/app/dashboard/pizarron/actions";

type Props = {
  pizarrones: Pizarron[];
  userId: string;
  puedeAdministrar: boolean;
};

function colorEsClaro(color: string) {
  const canales = color.match(/[0-9a-f]{2}/gi)?.map((canal) => parseInt(canal, 16)) || [];
  if (canales.length !== 3) return true;
  const [rojo, verde, azul] = canales.map((canal) => {
    const valor = canal / 255;
    return valor <= 0.04045 ? valor / 12.92 : ((valor + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rojo + 0.7152 * verde + 0.0722 * azul > 0.4;
}

export default function PizarronEditor({ pizarrones: iniciales, userId, puedeAdministrar }: Props) {
  const [pizarrones, setPizarrones] = useState(iniciales);
  const [activoId, setActivoId] = useState(iniciales[0]?.id || "");
  const [conectar, setConectar] = useState(false);
  const [origenConexion, setOrigenConexion] = useState<string | null>(null);
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [correo, setCorreo] = useState("");
  const [enlaceInvitacion, setEnlaceInvitacion] = useState("");
  const [mostrarCorreo, setMostrarCorreo] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const pizarron = pizarrones.find((item) => item.id === activoId);
  const editable = !!pizarron && !pizarron.compartido && (pizarron.creado_por === userId || puedeAdministrar);
  const elementoSeleccionado = pizarron?.elementos.find((item) => item.id === seleccionadoId);

  useEffect(() => {
    if (!pizarron?.compartido) return;

    const supabase = createBrowserClient();
    const canal = supabase
      .channel(`pizarron-compartido-${pizarron.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "pizarrones",
          filter: `id=eq.${pizarron.id}`,
        },
        async () => {
          const { data, error } = await supabase
            .from("pizarrones")
            .select("*")
            .eq("id", pizarron.id)
            .maybeSingle();
          if (error) {
            console.error("[pizarron] No se pudo actualizar el pizarrón compartido:", error.message);
            return;
          }
          if (!data) return;
          setPizarrones((actuales) =>
            actuales.map((item) => item.id === pizarron.id ? { ...data, compartido: true } : item)
          );
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error(`[pizarron] Falló la conexión en tiempo real: ${status}`);
        }
      });

    return () => {
      void supabase.removeChannel(canal);
    };
  }, [pizarron?.compartido, pizarron?.id]);

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
    setSeleccionadoId(null);
    setMostrarCorreo(false);
    setEnlaceInvitacion("");
    setMensaje("");
  }

  async function generarEnlaceInvitacion() {
    if (!pizarron || !editable) return;
    setOcupado(true);
    const resultado = await crearEnlaceInvitacion(pizarron.id);
    setOcupado(false);
    if (!resultado.token) {
      setMensaje(resultado.error || "No se pudo generar el enlace.");
      return;
    }
    setEnlaceInvitacion(`${window.location.origin}/dashboard/pizarron/invitacion/${resultado.token}`);
    setMensaje("Enlace de invitación listo para compartir.");
  }

  async function copiarEnlaceInvitacion() {
    if (!enlaceInvitacion) return;
    try {
      await navigator.clipboard.writeText(enlaceInvitacion);
      setMensaje("Enlace copiado.");
    } catch (error) {
      console.error("[pizarron] No se pudo copiar el enlace:", error);
      setMensaje("No se pudo copiar automáticamente. Selecciona y copia el enlace.");
    }
  }

  async function revocarInvitacionActual() {
    if (!pizarron || !editable) return;
    setOcupado(true);
    const resultado = await revocarEnlaceInvitacion(pizarron.id);
    setOcupado(false);
    if (resultado.error) {
      setMensaje(resultado.error);
      return;
    }
    setEnlaceInvitacion("");
    setMensaje("Enlace revocado. Quienes ya lo agregaron conservarán el acceso; los demás ya no podrán aceptarlo.");
  }

  async function crearCopiaPersonal() {
    if (!pizarron?.compartido) return;
    setOcupado(true);
    const resultado = await clonarPizarron(pizarron.id);
    setOcupado(false);
    if (!resultado.pizarron) {
      setMensaje(resultado.error || "No se pudo clonar el pizarrón.");
      return;
    }
    setPizarrones((actuales) => [{ ...resultado.pizarron!, compartido: false }, ...actuales]);
    setActivoId(resultado.pizarron.id);
    setSeleccionadoId(null);
    setEnlaceInvitacion("");
    setMensaje("Copia personal creada. Ya puedes editarla.");
  }

  async function quitarCompartidoActual() {
    if (!pizarron?.compartido) return;
    setOcupado(true);
    const resultado = await quitarPizarronCompartido(pizarron.id);
    setOcupado(false);
    if (resultado.error) {
      setMensaje(resultado.error);
      return;
    }
    const siguientes = pizarrones.filter((item) => item.id !== pizarron.id);
    setPizarrones(siguientes);
    setActivoId(siguientes[0]?.id || "");
    setSeleccionadoId(null);
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
      ancho: ANCHO_INICIAL_PIZARRON,
      alto: ALTO_INICIAL_PIZARRON,
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
    if (!conectar || !pizarron || !editable) {
      setSeleccionadoId(id);
      return;
    }
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
    const elemento = pizarron.elementos.find((item) => item.id === arrastrando);
    if (!elemento) return;
    const x = Math.max(
      0,
      Math.min(100 - anchoDeElemento(elemento) / 10, ((event.clientX - bounds.left) / bounds.width) * 100)
    );
    const y = Math.max(
      0,
      Math.min(100 - altoDeElemento(elemento) / 6.5, ((event.clientY - bounds.top) / bounds.height) * 100)
    );
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
    setSeleccionadoId(null);
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
                setSeleccionadoId(null);
                setMostrarCorreo(false);
                setEnlaceInvitacion("");
                setMensaje("");
              }}
              className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                item.id === activoId
                  ? "border-accent/50 bg-accent/10 text-accent-soft"
                  : "border-base-600 bg-base-800 text-gray-400 hover:text-gray-100"
              }`}
            >
              {item.titulo}
              {item.compartido && (
                <span className="ml-2 text-[10px] uppercase tracking-wide text-accent-soft">Compartido</span>
              )}
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
            {pizarron.compartido && (
              <>
                <button className="btn-primary" onClick={crearCopiaPersonal} disabled={ocupado}>
                  Clonar a mis pizarrones
                </button>
                <button className="btn-secondary" onClick={quitarCompartidoActual} disabled={ocupado}>
                  Quitar de mi lista
                </button>
              </>
            )}
          </div>

          {editable && !pizarron.compartido && (
            <div className="card space-y-3 p-4">
              <div>
                <h3 className="text-sm font-medium text-gray-200">Compartir con el equipo</h3>
                <p className="mt-1 text-xs text-gray-500">
                  Quien acepte el enlace podrá ver en vivo los cambios guardados y clonar el pizarrón. No podrá editar el original.
                </p>
              </div>
              {enlaceInvitacion ? (
                <div className="flex flex-wrap gap-2">
                  <input
                    className="input-field min-w-[220px] flex-1 text-sm"
                    aria-label="Enlace de invitación"
                    readOnly
                    value={enlaceInvitacion}
                    onFocus={(event) => event.currentTarget.select()}
                  />
                  <button className="btn-secondary" onClick={copiarEnlaceInvitacion}>
                    Copiar enlace
                  </button>
                  <button className="btn-secondary text-signal-urgent" onClick={revocarInvitacionActual} disabled={ocupado}>
                    Revocar enlace
                  </button>
                </div>
              ) : (
                <button className="btn-secondary w-fit" onClick={generarEnlaceInvitacion} disabled={ocupado}>
                  Generar enlace de invitación
                </button>
              )}
            </div>
          )}

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
            <p className="text-sm text-gray-500">
              {pizarron.compartido
                ? "Pizarrón compartido en modo de solo lectura. Recibirás en tiempo real los cambios guardados; clónalo para editar tu propia copia."
                : "Este pizarrón es de otra persona. Puedes revisarlo, enviarlo o descargarlo."}
            </p>
          )}

          {editable && elementoSeleccionado && (
            <div className="card flex flex-wrap items-end gap-4 p-4">
              <p className="w-full text-sm font-medium text-gray-200">
                Ajustes de {elementoSeleccionado.tipo === "idea" ? "idea" : "texto"}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Color</span>
                {COLORES_IDEA.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Usar color ${color}`}
                    aria-pressed={elementoSeleccionado.color.toLowerCase() === color.toLowerCase()}
                    className="h-7 w-7 rounded-full border border-white/30 ring-offset-2 ring-offset-base-800 aria-pressed:ring-2 aria-pressed:ring-accent"
                    style={{ backgroundColor: color }}
                    onClick={() => actualizarElemento(elementoSeleccionado.id, { color })}
                  />
                ))}
              <label className="flex items-center gap-2 text-xs text-gray-400">
                <input
                  aria-label="Color del elemento seleccionado"
                  className="h-9 w-12 cursor-pointer rounded border border-base-500 bg-transparent p-1"
                  type="color"
                  value={elementoSeleccionado.color}
                  onChange={(event) => actualizarElemento(elementoSeleccionado.id, { color: event.target.value })}
                />
              </label>
              </div>
              <label className="min-w-[180px] flex-1 text-xs text-gray-400">
                Ancho: {anchoDeElemento(elementoSeleccionado)} px
                <input
                  aria-label="Ancho del elemento seleccionado"
                  className="mt-2 block w-full accent-accent"
                  type="range"
                  min={ANCHO_MIN_PIZARRON}
                  max={ANCHO_MAX_PIZARRON}
                  step={10}
                  value={anchoDeElemento(elementoSeleccionado)}
                  onChange={(event) =>
                    actualizarElemento(elementoSeleccionado.id, { ancho: Number(event.target.value) })
                  }
                />
              </label>
              <label className="min-w-[180px] flex-1 text-xs text-gray-400">
                Alto: {altoDeElemento(elementoSeleccionado)} px
                <input
                  aria-label="Alto del elemento seleccionado"
                  className="mt-2 block w-full accent-accent"
                  type="range"
                  min={ALTO_MIN_PIZARRON}
                  max={ALTO_MAX_PIZARRON}
                  step={10}
                  value={altoDeElemento(elementoSeleccionado)}
                  onChange={(event) =>
                    actualizarElemento(elementoSeleccionado.id, { alto: Number(event.target.value) })
                  }
                />
              </label>
              <button
                className="btn-ghost text-xs"
                onClick={() => setSeleccionadoId(null)}
              >
                Cerrar ajustes
              </button>
            </div>
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
                {pizarron.conexiones.map((conexion, index) => {
                  const hacia = pizarron.elementos.find((elemento) => elemento.id === conexion.hacia);
                  if (!hacia) return null;
                  return (
                    <g key={conexion.id}>
                      <linearGradient id={`pizarron-linea-${index}`}>
                        <stop offset="0%" stopColor={pizarron.elementos.find((elemento) => elemento.id === conexion.desde)?.color || "#6f849e"} />
                        <stop offset="100%" stopColor={hacia.color} />
                      </linearGradient>
                      <marker
                        id={`pizarron-flecha-${index}`}
                        markerWidth="8"
                        markerHeight="8"
                        refX="6"
                        refY="3"
                        orient="auto"
                      >
                        <path d="M0,0 L0,6 L6,3 z" fill={hacia.color} />
                      </marker>
                    </g>
                  );
                })}
              </defs>
              {pizarron.conexiones.map((conexion, index) => {
                const desde = pizarron.elementos.find((elemento) => elemento.id === conexion.desde);
                const hacia = pizarron.elementos.find((elemento) => elemento.id === conexion.hacia);
                if (!desde || !hacia) return null;
                return (
                  <line
                    key={conexion.id}
                    x1={desde.x * 10 + anchoDeElemento(desde) / 2}
                    y1={desde.y * 6.5 + altoDeElemento(desde) / 2}
                    x2={hacia.x * 10 + anchoDeElemento(hacia) / 2}
                    y2={hacia.y * 6.5 + altoDeElemento(hacia) / 2}
                    stroke={`url(#pizarron-linea-${index})`}
                    strokeWidth="2"
                    markerEnd={`url(#pizarron-flecha-${index})`}
                  />
                );
              })}
            </svg>

            {pizarron.elementos.map((elemento) => (
              <div
                key={elemento.id}
                className={`absolute flex flex-col overflow-hidden rounded-xl border p-3 shadow-lg ${
                  elemento.tipo === "idea" ? "text-gray-950" : "bg-base-800/95 text-gray-100"
                } ${conectar && editable ? "cursor-crosshair ring-2 ring-accent/30" : editable ? "cursor-grab active:cursor-grabbing" : ""} ${
                  origenConexion === elemento.id || seleccionadoId === elemento.id ? "ring-2 ring-accent" : ""
                }`}
                style={{
                  left: `${elemento.x}%`,
                  top: `${elemento.y}%`,
                  width: `${anchoDeElemento(elemento) / 10}%`,
                  height: `${altoDeElemento(elemento) / 6.5}%`,
                  backgroundColor: elemento.color,
                  borderColor: elemento.color,
                  color: colorEsClaro(elemento.color) ? "#1a2130" : "#f3f4f6",
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
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                    {elemento.tipo === "idea" ? "Idea" : "Texto"}
                  </span>
                  {editable && (
                    <button
                      className="rounded px-1 text-xs opacity-70 hover:opacity-100"
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
                  className={`min-h-0 w-full flex-1 resize-none bg-transparent text-sm leading-relaxed outline-none ${
                    elemento.tipo === "idea" ? "font-semibold" : ""
                  }`}
                  style={{ color: colorEsClaro(elemento.color) ? "#1a2130" : "#f3f4f6" }}
                  value={elemento.texto}
                  disabled={!editable}
                  maxLength={2000}
                  onChange={(event) => actualizarElemento(elemento.id, { texto: event.target.value })}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!conectar) setSeleccionadoId(elemento.id);
                  }}
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
