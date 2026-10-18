"use client";

import { useRef, useState } from "react";
import { crearProspecto } from "@/app/dashboard/ventas/actions";

export default function FormularioCaptacion({ giros }: { giros: any[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [abierto, setAbierto] = useState(false);

  async function onSubmit(formData: FormData) {
    setEnviando(true);
    try {
      await crearProspecto(formData);
      formRef.current?.reset();
      setAbierto(false);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-semibold">Captación de prospectos</h2>
          <p className="mt-1 text-sm text-gray-500">Registra un nuevo prospecto cuando lo necesites.</p>
        </div>
        <button
          type="button"
          onClick={() => setAbierto((actual) => !actual)}
          aria-expanded={abierto}
          aria-controls="formulario-captacion"
          className="btn-primary"
        >
          {abierto ? "Cerrar formulario" : "Registrar prospecto"}
        </button>
      </div>

      {abierto && (
        <form id="formulario-captacion" ref={formRef} action={onSubmit} className="mt-5 grid grid-cols-1 gap-4 border-t border-base-700 pt-5 sm:grid-cols-2">
          <div>
            <label className="label-field">Nombre completo del contacto *</label>
            <input name="nombre_contacto" required className="input-field" />
          </div>
          <div>
            <label className="label-field">Nombre de la empresa / negocio *</label>
            <input name="nombre_empresa" required className="input-field" />
          </div>
          <div>
            <label className="label-field">Giro o industria *</label>
            <select name="giro_id" required className="input-field">
              <option value="">Selecciona...</option>
              {giros.map((g) => (
                <option key={g.id} value={g.id}>{g.nombre}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label-field">Teléfono *</label>
              <input name="telefono" required placeholder="+52..." className="input-field" />
            </div>
            <div>
              <label className="label-field">Email</label>
              <input name="email" type="email" className="input-field" />
            </div>
          </div>
          <div>
            <label className="label-field">Necesidad detectada *</label>
            <textarea name="necesidad_detectada" required rows={3} className="input-field" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label-field">Fuente del lead</label>
              <select name="fuente_lead" className="input-field">
                <option value="">—</option>
                <option value="referido">Referido</option>
                <option value="redes">Redes</option>
                <option value="llamada">Llamada</option>
                <option value="evento">Evento</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div>
              <label className="label-field">Presupuesto estimado</label>
              <select name="presupuesto_estimado" className="input-field">
                <option value="">—</option>
                <option value="bajo">Bajo</option>
                <option value="medio">Medio</option>
                <option value="alto">Alto</option>
              </select>
            </div>
          </div>

          <button type="submit" disabled={enviando} className="btn-primary sm:col-span-2">
            {enviando ? "Guardando..." : "Guardar prospecto"}
          </button>
        </form>
      )}
    </section>
  );
}
