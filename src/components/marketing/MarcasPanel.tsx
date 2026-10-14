"use client";

import { useState } from "react";
import { cambiarEstadoMarca, eliminarMarca, guardarMarca } from "@/app/dashboard/marketing/actions";

const PLATAFORMAS = ["Instagram", "TikTok", "YouTube", "Facebook", "LinkedIn", "X"];
type Marca = {
  id: string;
  cliente_id: string | null;
  nombre: string;
  logo_url: string | null;
  color: string;
  plataformas_activas: string[];
  activa: boolean;
};
type Cliente = { id: string; nombre_empresa: string; foto_url: string | null };

export default function MarcasPanel({ marcas, clientes }: { marcas: Marca[]; clientes: Cliente[] }) {
  const [editando, setEditando] = useState<Marca | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const plataformasDisponibles = [...new Set([
    ...PLATAFORMAS,
    ...(editando?.plataformas_activas || []),
  ])];

  async function submit(form: FormData) {
    setGuardando(true);
    setError("");
    try {
      await guardarMarca({
        id: editando?.id,
        cliente_id: String(form.get("cliente_id") || "") || null,
        nombre: String(form.get("nombre") || ""),
        logo_url: String(form.get("logo_url") || ""),
        color: String(form.get("color") || "#3AA7A1"),
        plataformas_activas: [
          ...form.getAll("plataformas").map(String),
          ...String(form.get("plataformas_extra") || "").split(","),
        ],
      });
      setAbierto(false);
      setEditando(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la marca.");
    } finally {
      setGuardando(false);
    }
  }

  async function alternar(marca: Marca) {
    setError("");
    try {
      await cambiarEstadoMarca(marca.id, !marca.activa);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo actualizar la marca.");
    }
  }

  async function borrar(marca: Marca) {
    if (!window.confirm(`¿Eliminar la marca “${marca.nombre}”? Las marcas con contenido no se pueden eliminar; archívalas para conservar el historial.`)) return;
    setError("");
    try {
      await eliminarMarca(marca.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar la marca.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-display font-semibold">Marcas</h2>
          <p className="text-sm text-gray-500 mt-1">Administra identidad y plataformas de cada marca.</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditando(null); setAbierto(true); }}>
          Nueva marca
        </button>
      </div>
      {error && <p role="alert" className="text-sm text-signal-urgent">{error}</p>}
      {marcas.length === 0 ? (
        <div className="card p-8 text-center text-gray-500">Todavía no hay marcas.</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {marcas.map((marca) => (
            <article key={marca.id} className="card p-4 space-y-4">
              <div className="flex items-center gap-3 min-w-0">
                {marca.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={marca.logo_url} alt="" className="w-12 h-12 rounded-lg object-cover bg-base-700" />
                ) : (
                  <span className="w-12 h-12 rounded-lg shrink-0" style={{ backgroundColor: marca.color }} />
                )}
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-100 truncate">{marca.nombre}</h3>
                  <p className="text-xs text-accent-soft truncate">
                    {clientes.find((cliente) => cliente.id === marca.cliente_id)?.nombre_empresa || "Marca independiente"}
                  </p>
                  <p className="text-xs text-gray-500">{marca.activa ? "Activa" : "Archivada"}</p>
                </div>
                <span className="ml-auto w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: marca.color }} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {marca.plataformas_activas.map((plataforma) => (
                  <span key={plataforma} className="badge">{plataforma}</span>
                ))}
                {marca.plataformas_activas.length === 0 && <span className="text-xs text-gray-600">Sin plataformas</span>}
              </div>
              <div className="flex gap-2 border-t border-base-700 pt-3">
                <button className="btn-secondary flex-1" onClick={() => { setEditando(marca); setAbierto(true); }}>Editar</button>
                <button className="btn-ghost" onClick={() => alternar(marca)}>
                  {marca.activa ? "Archivar" : "Reactivar"}
                </button>
                <button className="btn-ghost text-signal-urgent" onClick={() => borrar(marca)}>Eliminar</button>
              </div>
            </article>
          ))}
        </div>
      )}

      {abierto && (
        <div className="fixed inset-0 z-50 bg-base-950/80 flex items-center justify-center p-3" onMouseDown={(e) => {
          if (e.target === e.currentTarget) setAbierto(false);
        }}>
          <form action={submit} className="card w-full max-w-lg p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-display text-lg font-semibold">{editando ? "Editar marca" : "Crear marca"}</h3>
            <label className="block text-sm text-gray-300">Nombre
              <input name="nombre" required defaultValue={editando?.nombre} className="input-field mt-1" maxLength={100} />
            </label>
            <label className="block text-sm text-gray-300">Cliente del CRM (opcional)
              <select name="cliente_id" defaultValue={editando?.cliente_id || ""} className="input-field mt-1">
                <option value="">Marca independiente</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>{cliente.nombre_empresa}</option>
                ))}
              </select>
              <span className="block text-xs text-gray-500 mt-1">Una empresa puede tener varias marcas. Los clientes existentes ya aparecen vinculados.</span>
            </label>
            <label className="block text-sm text-gray-300">URL del logo
              <input name="logo_url" type="url" defaultValue={editando?.logo_url || ""} className="input-field mt-1" placeholder="https://" />
            </label>
            <label className="flex items-center gap-3 text-sm text-gray-300">Color de marca
              <input name="color" type="color" defaultValue={editando?.color || "#3AA7A1"} className="h-10 w-14 rounded bg-base-800 border border-base-600" />
            </label>
            <fieldset>
              <legend className="text-sm text-gray-300 mb-2">Plataformas activas</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {plataformasDisponibles.map((plataforma) => (
                  <label key={plataforma} className="flex items-center gap-2 text-sm text-gray-400">
                    <input type="checkbox" name="plataformas" value={plataforma} defaultChecked={editando?.plataformas_activas.includes(plataforma)} />
                    {plataforma}
                  </label>
                ))}
              </div>
              <input name="plataformas_extra" className="input-field mt-3" placeholder="Otras plataformas, separadas por coma" />
            </fieldset>
            {error && <p role="alert" className="text-sm text-signal-urgent">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setAbierto(false)}>Cancelar</button>
              <button disabled={guardando} className="btn-primary">{guardando ? "Guardando…" : "Guardar marca"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
