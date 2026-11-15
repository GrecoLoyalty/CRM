"use client";

import { useRef, useState } from "react";
import type { PreventaCuenta } from "@/lib/types";

function Copiable({ etiqueta, valor, mono = true }: { etiqueta: string; valor: string; mono?: boolean }) {
  const [ok, setOk] = useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(valor);
      setOk(true);
      setTimeout(() => setOk(false), 1800);
    } catch {
      window.prompt("Copia este dato:", valor);
    }
  }
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-base-700 last:border-0">
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{etiqueta}</p>
        <p className={`text-sm text-gray-100 break-all ${mono ? "font-mono" : ""}`}>{valor}</p>
      </div>
      <button type="button" onClick={copiar} className="btn-secondary text-xs shrink-0" aria-label={`Copiar ${etiqueta}`}>
        {ok ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}

export default function CarruselPago({
  cuentas,
  folio,
  monto,
}: {
  cuentas: PreventaCuenta[];
  folio: string;
  monto: string;
}) {
  const pista = useRef<HTMLDivElement>(null);
  const [actual, setActual] = useState(0);

  function ir(i: number) {
    const el = pista.current;
    if (!el) return;
    const destino = Math.min(Math.max(i, 0), cuentas.length - 1);
    el.scrollTo({ left: destino * el.clientWidth, behavior: "smooth" });
  }

  function onScroll() {
    const el = pista.current;
    if (!el) return;
    setActual(Math.round(el.scrollLeft / el.clientWidth));
  }

  return (
    <div role="region" aria-roledescription="carrusel" aria-label="Cuentas para depositar">
      <div
        ref={pista}
        onScroll={onScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth gap-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {cuentas.map((c, i) => (
          <article
            key={c.id}
            className="snap-center shrink-0 w-full bg-base-800 border border-base-600 rounded-lg p-4"
            aria-roledescription="diapositiva"
            aria-label={`Cuenta ${i + 1} de ${cuentas.length}`}
          >
            <p className="text-xs uppercase tracking-wide text-accent-soft mb-1">{c.etiqueta || c.banco}</p>
            <Copiable etiqueta="Banco" valor={c.banco} mono={false} />
            <Copiable etiqueta="Nombre completo del titular" valor={c.titular} mono={false} />
            {c.clabe && <Copiable etiqueta="CLABE interbancaria" valor={c.clabe} />}
            {c.numero_cuenta && <Copiable etiqueta="Número de cuenta / tarjeta" valor={c.numero_cuenta} />}
            <Copiable etiqueta="Concepto / referencia" valor={folio} />
            <Copiable etiqueta="Monto a depositar" valor={monto} mono={false} />
          </article>
        ))}
      </div>

      {cuentas.length > 1 && (
        <div className="mt-3 flex items-center justify-between">
          <button type="button" onClick={() => ir(actual - 1)} disabled={actual === 0} className="btn-secondary text-xs" aria-label="Cuenta anterior">
            ←
          </button>
          <div className="flex items-center gap-2" role="tablist" aria-label="Elegir cuenta">
            {cuentas.map((c, i) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={i === actual}
                aria-label={`Ir a la cuenta ${i + 1}`}
                onClick={() => ir(i)}
                className={`h-2 rounded-full transition-all ${i === actual ? "w-5 bg-accent" : "w-2 bg-base-600"}`}
              />
            ))}
          </div>
          <button type="button" onClick={() => ir(actual + 1)} disabled={actual === cuentas.length - 1} className="btn-secondary text-xs" aria-label="Cuenta siguiente">
            →
          </button>
        </div>
      )}
    </div>
  );
}
