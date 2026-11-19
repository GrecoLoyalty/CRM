"use client";

import { useRef, useState } from "react";
import { DEPTO_COLOR, DEPTO_LABEL, type Depto } from "@/lib/types";

interface MiembroEquipoPortal {
  nombre_completo: string;
  avatar_url: string | null;
  depto: Depto;
}

export default function CarruselEquipoPortal({ miembros }: { miembros: MiembroEquipoPortal[] }) {
  const pista = useRef<HTMLDivElement>(null);
  const [actual, setActual] = useState(0);

  function irA(indice: number) {
    const destino = Math.min(Math.max(indice, 0), miembros.length - 1);
    const diapositiva = pista.current?.children.item(destino);
    if (diapositiva instanceof HTMLElement) {
      diapositiva.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      setActual(destino);
    }
  }

  function actualizarDiapositiva() {
    const elemento = pista.current;
    if (!elemento) return;
    const centro = elemento.getBoundingClientRect().left + elemento.clientWidth / 2;
    let masCercano = 0;
    let distanciaMinima = Number.POSITIVE_INFINITY;
    Array.from(elemento.children).forEach((diapositiva, indice) => {
      const rect = diapositiva.getBoundingClientRect();
      const distancia = Math.abs(rect.left + rect.width / 2 - centro);
      if (distancia < distanciaMinima) {
        distanciaMinima = distancia;
        masCercano = indice;
      }
    });
    setActual(masCercano);
  }

  return (
    <section className="card p-5 mt-8" aria-labelledby="equipo-portal-heading">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">El equipo asignado</p>
          <h2 id="equipo-portal-heading" className="font-display font-semibold mt-1">
            Personas que te acompañan
          </h2>
        </div>
        {miembros.length > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => irA(actual - 1)}
              disabled={actual === 0}
              className="btn-secondary w-9 h-9 p-0"
              aria-label="Miembro anterior"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => irA(actual + 1)}
              disabled={actual === miembros.length - 1}
              className="btn-secondary w-9 h-9 p-0"
              aria-label="Miembro siguiente"
            >
              →
            </button>
          </div>
        )}
      </div>

      <div
        ref={pista}
        onScroll={actualizarDiapositiva}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="region"
        aria-roledescription="carrusel"
        aria-label="Equipo asignado al proyecto"
      >
        {miembros.map((miembro, indice) => (
          <article
            key={`${miembro.depto}-${miembro.nombre_completo}-${indice}`}
            className="snap-center shrink-0 w-[82%] sm:w-[48%] md:w-[40%] min-h-40 rounded-xl border border-base-600 bg-base-800 p-4 flex items-center gap-4"
            aria-roledescription="diapositiva"
            aria-label={`${miembro.nombre_completo}, ${indice + 1} de ${miembros.length}`}
          >
            {miembro.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={miembro.avatar_url}
                alt={miembro.nombre_completo}
                className="w-16 h-16 rounded-full object-cover border-2 border-base-600 shrink-0"
              />
            ) : (
              <span className="w-16 h-16 rounded-full bg-base-700 border-2 border-base-600 flex items-center justify-center text-xl font-semibold text-accent-soft shrink-0">
                {miembro.nombre_completo.charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full mb-2 ${DEPTO_COLOR[miembro.depto]}`}>
                {DEPTO_LABEL[miembro.depto]}
              </span>
              <p className="font-medium text-sm text-gray-100 break-words">{miembro.nombre_completo}</p>
            </div>
          </article>
        ))}
      </div>

      {miembros.length > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-gray-500">{actual + 1} de {miembros.length}</span>
          <div className="flex items-center gap-1.5" role="tablist" aria-label="Seleccionar miembro del equipo">
            {miembros.map((miembro, indice) => (
              <button
                key={`${miembro.depto}-${miembro.nombre_completo}-${indice}-indicador`}
                type="button"
                role="tab"
                aria-selected={actual === indice}
                aria-label={`Ver a ${miembro.nombre_completo}`}
                onClick={() => irA(indice)}
                className={`h-1.5 rounded-full transition-all ${actual === indice ? "w-5 bg-accent" : "w-1.5 bg-base-600"}`}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
