"use client";

import { useState, useTransition } from "react";
import { actualizarInfoCliente } from "@/app/dashboard/cliente/actions";

interface GiroOpcion {
  id: string;
  nombre: string;
}

export default function EditarInfoCliente({
  clienteId,
  puedeEditar,
  giros,
  datosIniciales,
}: {
  clienteId: string;
  puedeEditar: boolean;
  giros: GiroOpcion[];
  datosIniciales: {
    nombre_empresa: string;
    nombre_contacto: string;
    telefono: string;
    email: string | null;
    giro_id: string | null;
    presupuesto_estimado: string | null;
    necesidad_detectada: string;
    notas_internas: string | null;
  };
}) {
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState(datosIniciales);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function campo<K extends keyof typeof form>(clave: K, valor: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [clave]: valor }));
  }

  function guardar() {
    setError(null);
    startTransition(async () => {
      try {
        await actualizarInfoCliente(clienteId, form);
        setEditando(false);
      } catch (e: any) {
        setError(e.message || "No se pudo guardar.");
      }
    });
  }

  if (!puedeEditar) return null; // Solo Root/CEO ven esta sección — el resto ve los datos en las secciones normales de la ficha.

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-semibold text-sm text-gray-400 uppercase tracking-wide">Editar información del cliente</h2>
        {!editando && (
          <button onClick={() => setEditando(true)} className="text-xs text-accent-soft hover:underline">
            Editar
          </button>
        )}
      </div>

      {!editando ? (
        <p className="text-xs text-gray-500">
          Datos de contacto, giro, presupuesto y notas internas. Click en &quot;Editar&quot; para modificarlos.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label-field">Nombre de la empresa</label>
              <input className="input-field" value={form.nombre_empresa} onChange={(e) => campo("nombre_empresa", e.target.value)} />
            </div>
            <div>
              <label className="label-field">Nombre del contacto</label>
              <input className="input-field" value={form.nombre_contacto} onChange={(e) => campo("nombre_contacto", e.target.value)} />
            </div>
            <div>
              <label className="label-field">Teléfono</label>
              <input className="input-field" value={form.telefono} onChange={(e) => campo("telefono", e.target.value)} />
            </div>
            <div>
              <label className="label-field">Email</label>
              <input className="input-field" type="email" value={form.email || ""} onChange={(e) => campo("email", e.target.value || null)} />
            </div>
            <div>
              <label className="label-field">Giro / industria</label>
              <select className="input-field" value={form.giro_id || ""} onChange={(e) => campo("giro_id", e.target.value || null)}>
                <option value="">— sin especificar —</option>
                {giros.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-field">Presupuesto estimado</label>
              <select
                className="input-field"
                value={form.presupuesto_estimado || ""}
                onChange={(e) => campo("presupuesto_estimado", e.target.value || null)}
              >
                <option value="">— sin especificar —</option>
                <option value="bajo">Bajo</option>
                <option value="medio">Medio</option>
                <option value="alto">Alto</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label-field">Necesidad detectada</label>
            <textarea
              className="input-field"
              rows={3}
              value={form.necesidad_detectada}
              onChange={(e) => campo("necesidad_detectada", e.target.value)}
            />
          </div>

          <div>
            <label className="label-field">Notas internas / datos extra</label>
            <p className="text-xs text-gray-600 mb-1">Uso interno — nunca se muestra en el portal del cliente. Anota aquí cualquier dato que no encaje arriba.</p>
            <textarea
              className="input-field"
              rows={4}
              value={form.notas_internas || ""}
              onChange={(e) => campo("notas_internas", e.target.value || null)}
              placeholder="Acuerdos verbales, contexto de la relación, preferencias, lo que sea..."
            />
          </div>

          <div className="flex gap-2">
            <button onClick={guardar} disabled={pending} className="btn-primary text-xs px-3 py-1.5">
              {pending ? "Guardando..." : "Guardar cambios"}
            </button>
            <button
              onClick={() => {
                setForm(datosIniciales);
                setEditando(false);
                setError(null);
              }}
              className="btn-secondary text-xs px-3 py-1.5"
            >
              Cancelar
            </button>
          </div>
          {error && <p className="text-xs text-signal-urgent">{error}</p>}
        </div>
      )}
    </section>
  );
}
