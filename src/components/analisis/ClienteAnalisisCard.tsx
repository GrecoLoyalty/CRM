"use client";

import { useState } from "react";
import Link from "next/link";
import { guardarBriefing, enviarAProduccion } from "@/app/dashboard/analisis/actions";
import type { Cliente } from "@/lib/types";
import clsx from "clsx";

export default function ClienteAnalisisCard({ cliente }: { cliente: Cliente }) {
  const [abierto, setAbierto] = useState(false);
  const [briefing, setBriefing] = useState(cliente.briefing_texto || "");
  const [rutaVisual, setRutaVisual] = useState(cliente.ruta_visual);
  const [rutaSoftware, setRutaSoftware] = useState(cliente.ruta_software);
  const [guardando, setGuardando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  const briefingCompleto = briefing.trim().length > 0;
  const rutaSeleccionada = rutaVisual || rutaSoftware;
  const puedeEnviar = briefingCompleto && rutaSeleccionada;

  async function onGuardar(formData: FormData) {
    setGuardando(true);
    try {
      await guardarBriefing(cliente.id, formData);
    } finally {
      setGuardando(false);
    }
  }

  async function onEnviar() {
    setEnviando(true);
    setErrorEnvio(null);
    try {
      await enviarAProduccion(cliente.id);
    } catch (e: any) {
      setErrorEnvio(e.message.includes("BRIEFING_REQUERIDO") ? "Falta el Briefing." : "Falta activar al menos una ruta.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="card overflow-hidden">
      <button onClick={() => setAbierto(!abierto)} className="w-full flex items-center justify-between p-4 text-left">
        <div>
          <p className="font-medium">{cliente.nombre_empresa}</p>
          <p className="text-sm text-gray-500">{cliente.nombre_contacto} · {cliente.cliente_codigo}</p>
        </div>
        <span className="text-gray-500 text-sm">{abierto ? "Ocultar ▲" : "Ver ▼"}</span>
      </button>

      {abierto && (
        <div className="border-t border-base-600 p-5 space-y-6">
          <Link href={`/dashboard/cliente/${cliente.id}`} className="text-xs text-accent-soft underline">
            Ver ficha completa y bitácora →
          </Link>
          {/* Interfaz de doble entrada */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-base-900 rounded-lg p-4 border border-base-600">
              <p className="label-field">Datos del Vendedor (automático)</p>
              <dl className="text-sm space-y-1 mt-2">
                <div><dt className="inline text-gray-500">Necesidad: </dt><dd className="inline">{cliente.necesidad_detectada}</dd></div>
                <div><dt className="inline text-gray-500">Presupuesto: </dt><dd className="inline capitalize">{cliente.presupuesto_estimado || "—"}</dd></div>
                <div><dt className="inline text-gray-500">Fuente: </dt><dd className="inline capitalize">{cliente.fuente_lead || "—"}</dd></div>
              </dl>
            </div>
            <div className="bg-base-900 rounded-lg p-4 border border-base-600">
              <p className="label-field">Formulario de Profundidad (externo)</p>
              <p className="text-sm text-gray-500 mt-2">
                Enlace único enviado al cliente (expira en 72h). Aún sin respuesta.
              </p>
              <code className="text-xs text-accent-soft break-all block mt-2">
                /formulario/{cliente.form_profundidad_token}
              </code>
            </div>
          </div>

          {/* Briefing obligatorio */}
          <form action={onGuardar} className="space-y-3">
            <div>
              <label className="label-field">Briefing (instrucciones para producción) *</label>
              <textarea
                name="briefing_texto"
                rows={4}
                className="input-field"
                value={briefing}
                onChange={(e) => setBriefing(e.target.value)}
                placeholder="Describe el enfoque, tono de marca, referencias, objetivos técnicos..."
              />
            </div>
            <div>
              <label className="label-field">Fecha estimada de entrega</label>
              <input type="date" name="fecha_entrega_estimada" className="input-field w-48" defaultValue={cliente.fecha_entrega_estimada || ""} />
            </div>

            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="ruta_visual" checked={rutaVisual} onChange={(e) => setRutaVisual(e.target.checked)} className="accent-accent" />
                Ruta Visual (Estética)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="ruta_software" checked={rutaSoftware} onChange={(e) => setRutaSoftware(e.target.checked)} className="accent-accent" />
                Ruta Software (Desarrollo)
              </label>
            </div>

            <button type="submit" disabled={guardando} className="btn-secondary text-sm">
              {guardando ? "Guardando..." : "Guardar Brief"}
            </button>
          </form>

          <div className="pt-2 border-t border-base-600">
            <button
              onClick={onEnviar}
              disabled={!puedeEnviar || enviando}
              className={clsx("btn-primary w-full", !puedeEnviar && "opacity-40 cursor-not-allowed")}
              title={!puedeEnviar ? "Completa el Briefing y activa al menos una ruta" : ""}
            >
              {enviando ? "Enviando..." : "Enviar a producción"}
            </button>
            {!puedeEnviar && (
              <p className="text-xs text-gray-500 mt-2">
                Bloqueado hasta completar el Briefing {!rutaSeleccionada && "y activar al menos una ruta"}.
              </p>
            )}
            {errorEnvio && <p className="text-xs text-signal-urgent mt-2">{errorEnvio}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
