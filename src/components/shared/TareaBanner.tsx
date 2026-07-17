"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { useInactivityPing } from "@/hooks/useInactivityPing";

function useCountdown(fechaLimite: string | null) {
  const [restante, setRestante] = useState<number | null>(null);

  useEffect(() => {
    if (!fechaLimite) return;
    const limite = new Date(fechaLimite + "T23:59:59").getTime();
    const tick = () => setRestante(limite - Date.now());
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [fechaLimite]);

  return restante;
}

export default function TareaBanner({
  tarea,
  cliente,
  onAvanzar,
  accionLabel,
  trackActividad = true,
}: {
  tarea: any;
  cliente: any;
  onAvanzar?: () => void;
  accionLabel?: string;
  trackActividad?: boolean;
}) {
  const restanteMs = useCountdown(tarea.fecha_pactada_entrega);
  if (trackActividad) useInactivityPing(tarea.id);
  const [mostrarPerfil, setMostrarPerfil] = useState(false);

  function abrirChat() {
    if (!cliente?.id) return;
    window.dispatchEvent(new CustomEvent("gresanova:abrir-chat-cliente", { detail: cliente.id }));
  }

  let colorReloj = "text-green-400";
  let etiquetaReloj = "Sin fecha límite";
  if (restanteMs !== null) {
    const horas = restanteMs / 1000 / 3600;
    if (restanteMs < 0) {
      colorReloj = "text-signal-urgent";
      etiquetaReloj = "Vencida";
    } else if (horas < 4) {
      colorReloj = "text-signal-urgent";
      etiquetaReloj = `${Math.round(horas * 60)} min restantes`;
    } else if (horas < 24) {
      colorReloj = "text-signal-warn";
      etiquetaReloj = `${Math.round(horas)}h restantes`;
    } else {
      colorReloj = "text-green-400";
      etiquetaReloj = `${Math.round(horas / 24)}d restantes`;
    }
  }

  const iniciales = cliente?.nombre_empresa
    ?.split(" ")
    .slice(0, 2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="card p-4 flex gap-4">
      <div className="w-16 h-16 rounded-lg bg-accent/15 flex items-center justify-center shrink-0 overflow-hidden">
        {cliente?.foto_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cliente.foto_url} alt={cliente.nombre_empresa} className="w-full h-full object-cover" />
        ) : (
          <span className="font-display font-semibold text-accent-soft">{iniciales}</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium truncate">{tarea.titulo}</p>
            <p className="text-sm text-gray-500 truncate">{cliente?.nombre_empresa} · {cliente?.nombre_contacto}</p>
          </div>
          <span className={clsx("text-xs font-mono whitespace-nowrap", colorReloj)}>{etiquetaReloj}</span>
        </div>

        <div className="mt-2 h-1.5 bg-base-600 rounded-full overflow-hidden">
          <div className="h-full bg-accent" style={{ width: `${tarea.progreso_pct}%` }} />
        </div>

        <div className="flex items-center justify-between mt-3">
          <div className="flex gap-2">
            <button type="button" onClick={() => setMostrarPerfil(true)} className="text-xs text-gray-400 hover:text-gray-200 underline">
              Abrir perfil
            </button>
            <button type="button" onClick={abrirChat} className="text-xs text-gray-400 hover:text-gray-200 underline">
              Abrir chat
            </button>
          </div>
          {onAvanzar && (
            <button onClick={onAvanzar} className="btn-primary text-xs px-3 py-1.5">
              {accionLabel || "Avanzar"}
            </button>
          )}
        </div>
      </div>

      {mostrarPerfil && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setMostrarPerfil(false)}
        >
          <div className="card p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-lg bg-accent/15 flex items-center justify-center shrink-0 overflow-hidden">
                {cliente?.foto_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cliente.foto_url} alt={cliente.nombre_empresa} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-display font-semibold text-accent-soft">{iniciales}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate">{cliente?.nombre_empresa || "Sin nombre"}</p>
                <p className="text-sm text-gray-500 truncate">{cliente?.nombre_contacto}</p>
              </div>
            </div>
            <div className="mt-4 space-y-1.5 text-sm">
              {cliente?.email && <p className="text-gray-400">✉ {cliente.email}</p>}
              {cliente?.telefono && <p className="text-gray-400">☎ {cliente.telefono}</p>}
              {cliente?.estado && <p className="text-gray-400">Estado: <span className="text-gray-200">{cliente.estado}</span></p>}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={abrirChat} className="btn-secondary text-xs px-3 py-1.5">
                Abrir chat
              </button>
              <button type="button" onClick={() => setMostrarPerfil(false)} className="btn-primary text-xs px-3 py-1.5">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
