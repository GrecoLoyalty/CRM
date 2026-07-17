"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function BovedaCliente({ clientes }: { clientes: any[] }) {
  const [clienteId, setClienteId] = useState("");
  const [credenciales, setCredenciales] = useState<any[]>([]);
  const [revelada, setRevelada] = useState<Record<string, string>>({});
  const [nuevo, setNuevo] = useState({ servicio: "", usuario: "", password: "", notas: "" });
  const [guardando, setGuardando] = useState(false);

  async function cargarCredenciales(id: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from("boveda_credenciales")
      .select("id, servicio, usuario, fecha_expiracion, updated_at")
      .eq("cliente_id", id)
      .order("servicio");
    setCredenciales(data || []);
  }

  useEffect(() => {
    if (clienteId) cargarCredenciales(clienteId);
    else setCredenciales([]);
    setRevelada({});
  }, [clienteId]);

  async function verContrasena(id: string) {
    const res = await fetch(`/api/vault?id=${id}`);
    const data = await res.json();
    if (data.password) setRevelada((r) => ({ ...r, [id]: data.password }));
  }

  async function agregarCredencial() {
    if (!clienteId || !nuevo.servicio || !nuevo.usuario || !nuevo.password) return;
    setGuardando(true);
    await fetch("/api/vault", {
      method: "POST",
      body: JSON.stringify({ cliente_id: clienteId, ...nuevo }),
    });
    setNuevo({ servicio: "", usuario: "", password: "", notas: "" });
    setGuardando(false);
    cargarCredenciales(clienteId);
  }

  return (
    <div className="space-y-6">
      <div className="card p-4">
        <label className="label-field">Cliente</label>
        <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="input-field">
          <option value="">Selecciona un cliente...</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre_empresa} — {c.cliente_codigo}</option>
          ))}
        </select>
      </div>

      {clienteId && (
        <>
          <div className="card p-4 space-y-3">
            {credenciales.length === 0 && <p className="text-sm text-gray-500">Sin credenciales guardadas para este cliente.</p>}
            {credenciales.map((c) => (
              <div key={c.id} className="flex items-center justify-between border-b border-base-700 pb-2 last:border-0">
                <div>
                  <p className="text-sm font-medium">{c.servicio}</p>
                  <p className="text-xs text-gray-500">{c.usuario}</p>
                </div>
                <div className="flex items-center gap-3">
                  {revelada[c.id] ? (
                    <code className="text-xs bg-base-900 px-2 py-1 rounded text-accent-soft">{revelada[c.id]}</code>
                  ) : (
                    <button onClick={() => verContrasena(c.id)} className="btn-secondary text-xs">Ver contraseña</button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="card p-4">
            <h3 className="font-medium mb-3 text-sm">Agregar credencial</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input placeholder="Servicio (ej. Instagram)" value={nuevo.servicio} onChange={(e) => setNuevo({ ...nuevo, servicio: e.target.value })} className="input-field" />
              <input placeholder="Usuario" value={nuevo.usuario} onChange={(e) => setNuevo({ ...nuevo, usuario: e.target.value })} className="input-field" />
              <input placeholder="Contraseña" type="password" value={nuevo.password} onChange={(e) => setNuevo({ ...nuevo, password: e.target.value })} className="input-field" />
              <input placeholder="Notas (opcional)" value={nuevo.notas} onChange={(e) => setNuevo({ ...nuevo, notas: e.target.value })} className="input-field" />
            </div>
            <button onClick={agregarCredencial} disabled={guardando} className="btn-primary mt-3 text-sm">
              {guardando ? "Guardando..." : "Guardar credencial cifrada"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
