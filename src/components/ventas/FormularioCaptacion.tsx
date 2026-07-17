"use client";

import { useRef, useState } from "react";
import { crearProspecto } from "@/app/dashboard/ventas/actions";

export default function FormularioCaptacion({ giros }: { giros: any[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(formData: FormData) {
    setEnviando(true);
    try {
      await crearProspecto(formData);
      formRef.current?.reset();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form ref={formRef} action={onSubmit} className="card p-5 space-y-4 sticky top-6">
      <h2 className="font-display font-semibold">Formulario de Captación</h2>

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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

      <button type="submit" disabled={enviando} className="btn-primary w-full">
        {enviando ? "Guardando..." : "Registrar prospecto"}
      </button>
    </form>
  );
}
