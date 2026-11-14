"use client";

import { useRef, useState } from "react";
import { crearPreventa } from "@/app/dashboard/preventas/actions";

type Resultado = { folio: string; token: string; pagado: boolean };

export default function FormularioPreventa() {
  const formRef = useRef<HTMLFormElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [camino, setCamino] = useState<"pagado" | "pendiente">("pendiente");
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [copiado, setCopiado] = useState(false);

  const linkTicket = resultado ? `${window.location.origin}/ticket/${resultado.token}` : "";

  async function onSubmit(formData: FormData) {
    setEnviando(true);
    setError(null);
    try {
      formData.set("camino", camino);
      const r = await crearPreventa(formData);
      setResultado(r);
      formRef.current?.reset();
      setCamino("pendiente");
    } catch (e: any) {
      setError(e?.message || "No se pudo guardar la preventa.");
    } finally {
      setEnviando(false);
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(linkTicket);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      window.prompt("Copia este enlace:", linkTicket);
    }
  }

  function nueva() {
    setResultado(null);
    setError(null);
  }

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-semibold">Nueva preventa</h2>
          <p className="mt-1 text-sm text-gray-500">Registra al cliente y envíale su ticket de seguimiento.</p>
        </div>
        <button
          type="button"
          onClick={() => setAbierto((a) => !a)}
          aria-expanded={abierto}
          aria-controls="formulario-preventa"
          className="btn-primary"
        >
          {abierto ? "Cerrar formulario" : "Registrar preventa"}
        </button>
      </div>

      {abierto && resultado && (
        <div className="mt-5 border-t border-base-700 pt-5 space-y-4" role="status">
          <div className="border border-accent/30 bg-accent/10 rounded-lg p-4">
            <p className="text-sm font-medium text-accent-soft">Preventa {resultado.folio} registrada</p>
            <p className="text-sm text-gray-300 mt-1">
              {resultado.pagado
                ? "Anticipo marcado como recibido. Envía el ticket al cliente para que siga su pedido."
                : "El ticket del cliente le mostrará los datos bancarios y el monto del anticipo."}
            </p>
            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <input readOnly value={linkTicket} onFocus={(e) => e.currentTarget.select()} className="input-field flex-1" aria-label="Enlace del ticket" />
              <button type="button" onClick={copiar} className="btn-secondary">
                {copiado ? "Copiado" : "Copiar enlace"}
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Hola, aquí puedes dar seguimiento a tu pedido (${resultado.folio}): ${linkTicket}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-center"
              >
                WhatsApp
              </a>
            </div>
          </div>
          <button type="button" onClick={nueva} className="btn-secondary">
            Registrar otra preventa
          </button>
        </div>
      )}

      {abierto && !resultado && (
        <form
          id="formulario-preventa"
          ref={formRef}
          action={onSubmit}
          className="mt-5 grid grid-cols-1 gap-4 border-t border-base-700 pt-5 sm:grid-cols-2"
        >
          <div>
            <label className="label-field" htmlFor="pv-nombre">Nombre del cliente *</label>
            <input id="pv-nombre" name="nombre_cliente" required autoComplete="off" className="input-field" />
          </div>
          <div>
            <label className="label-field" htmlFor="pv-negocio">Nombre del negocio *</label>
            <input id="pv-negocio" name="nombre_negocio" required autoComplete="off" className="input-field" />
          </div>
          <div>
            <label className="label-field" htmlFor="pv-tel">Teléfono *</label>
            <input id="pv-tel" name="telefono" type="tel" inputMode="tel" required placeholder="10 dígitos" className="input-field" />
          </div>
          <div>
            <label className="label-field" htmlFor="pv-email">Correo electrónico *</label>
            <input id="pv-email" name="email" type="email" required className="input-field" />
          </div>
          <div className="sm:col-span-2">
            <label className="label-field" htmlFor="pv-dir">Dirección de entrega *</label>
            <textarea id="pv-dir" name="direccion" required rows={2} className="input-field" />
          </div>

          <div className="sm:col-span-2 border-t border-base-700 pt-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="label-field" htmlFor="pv-prod">Producto *</label>
              <input id="pv-prod" name="producto" required className="input-field" />
            </div>
            <div>
              <label className="label-field" htmlFor="pv-cant">Cantidad *</label>
              <input id="pv-cant" name="cantidad" type="number" min={1} step={1} defaultValue={1} required className="input-field" />
            </div>
            <div className="hidden sm:block" />
            <div>
              <label className="label-field" htmlFor="pv-total">Monto total ($) *</label>
              <input id="pv-total" name="monto_total" type="number" min={0} step="0.01" required className="input-field" />
            </div>
            <div>
              <label className="label-field" htmlFor="pv-anticipo">Anticipo ($) *</label>
              <input id="pv-anticipo" name="monto_anticipo" type="number" min={0} step="0.01" required className="input-field" />
            </div>
          </div>

          <fieldset className="sm:col-span-2 border-t border-base-700 pt-4">
            <legend className="label-field mb-2">¿El cliente ya pagó el anticipo? *</legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className={`border rounded-lg p-3 cursor-pointer text-sm ${camino === "pagado" ? "border-accent bg-accent/10" : "border-base-600"}`}>
                <input type="radio" name="camino_ui" checked={camino === "pagado"} onChange={() => setCamino("pagado")} className="accent-accent mr-2" />
                <span className="font-medium">Sí, recibí el dinero</span>
                <span className="block text-xs text-gray-500 mt-1 ml-5">Queda registrado como pagado y el cliente recibe su ticket.</span>
              </label>
              <label className={`border rounded-lg p-3 cursor-pointer text-sm ${camino === "pendiente" ? "border-accent bg-accent/10" : "border-base-600"}`}>
                <input type="radio" name="camino_ui" checked={camino === "pendiente"} onChange={() => setCamino("pendiente")} className="accent-accent mr-2" />
                <span className="font-medium">No, aún no paga</span>
                <span className="block text-xs text-gray-500 mt-1 ml-5">Su ticket mostrará los datos bancarios y el monto a depositar.</span>
              </label>
            </div>

            {camino === "pagado" && (
              <div className="mt-3 sm:max-w-xs">
                <label className="label-field" htmlFor="pv-metodo">Método con el que pagó *</label>
                <select id="pv-metodo" name="pago_metodo" defaultValue="efectivo" className="input-field">
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
            )}
          </fieldset>

          <div className="sm:col-span-2">
            <label className="label-field" htmlFor="pv-notas">Notas (opcional)</label>
            <textarea id="pv-notas" name="notas" rows={2} className="input-field" />
          </div>

          {error && (
            <p role="alert" className="sm:col-span-2 text-sm text-signal-urgent border border-signal-urgent/30 bg-signal-urgent/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button type="submit" disabled={enviando} className="btn-primary sm:col-span-2">
            {enviando ? "Guardando..." : "Guardar preventa y generar ticket"}
          </button>
        </form>
      )}
    </section>
  );
}
