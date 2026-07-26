"use client";

import { useEffect, useState, useTransition } from "react";
import { fijarFechaEtapa, actualizarMostrarFicha, crearAvisoPortal, desactivarAvisoPortal } from "@/app/dashboard/ceo/actions";
import { createClient } from "@/lib/supabase/client";
import type { NivelUrgencia, PortalAviso } from "@/lib/types";

const NIVEL_LABEL: Record<NivelUrgencia, string> = {
  informativo: "Informativo",
  importante: "Importante",
  urgente: "Urgente",
};

const NIVEL_ESTILO: Record<NivelUrgencia, string> = {
  informativo: "bg-signal-info/15 text-signal-info border-signal-info/30",
  importante: "bg-signal-warn/15 text-signal-warn border-signal-warn/30",
  urgente: "bg-signal-urgent/15 text-signal-urgent border-signal-urgent/30",
};

export default function GestionPortalCliente({ clientes }: { clientes: any[] }) {
  const [clienteId, setClienteId] = useState("");
  const [fecha, setFecha] = useState("");
  const [comentario, setComentario] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const [mostrarFicha, setMostrarFicha] = useState(false);
  const [pendingFicha, startTransitionFicha] = useTransition();

  const [avisos, setAvisos] = useState<PortalAviso[]>([]);
  const [mensajeAviso, setMensajeAviso] = useState("");
  const [nivelAviso, setNivelAviso] = useState<NivelUrgencia>("informativo");
  const [horasExpira, setHorasExpira] = useState<number | "">(48);
  const [pendingAviso, startTransitionAviso] = useTransition();

  const cliente = clientes.find((c) => c.id === clienteId);
  const portalUrl = cliente ? `${typeof window !== "undefined" ? window.location.origin : ""}/portal/${cliente.portal_token}` : "";

  useEffect(() => {
    setMostrarFicha(cliente?.mostrar_ficha_portal || false);
    if (!clienteId) {
      setAvisos([]);
      return;
    }
    cargarAvisos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId]);

  async function cargarAvisos() {
    const supabase = createClient();
    const { data } = await supabase
      .from("portal_avisos")
      .select("*")
      .eq("cliente_id", clienteId)
      .eq("activo", true)
      .order("created_at", { ascending: false });
    setAvisos(data || []);
  }

  async function guardar() {
    if (!clienteId) return;
    setGuardando(true);
    try {
      await fijarFechaEtapa(clienteId, cliente.estado, fecha, comentario);
      setFecha("");
      setComentario("");
    } finally {
      setGuardando(false);
    }
  }

  function alternarFicha() {
    const nuevo = !mostrarFicha;
    setMostrarFicha(nuevo);
    startTransitionFicha(async () => {
      await actualizarMostrarFicha(clienteId, nuevo);
    });
  }

  function publicarAviso() {
    if (!mensajeAviso.trim()) return;
    startTransitionAviso(async () => {
      await crearAvisoPortal(clienteId, mensajeAviso, nivelAviso, horasExpira === "" ? null : horasExpira);
      setMensajeAviso("");
      cargarAvisos();
    });
  }

  function quitarAviso(avisoId: string) {
    startTransitionAviso(async () => {
      await desactivarAvisoPortal(avisoId);
      cargarAvisos();
    });
  }

  return (
    <section className="card p-5">
      <h2 className="font-display font-semibold mb-1">Portal del cliente</h2>
      <p className="text-sm text-gray-500 mb-4">
        Fija una fecha aproximada y un comentario público para la etapa actual del cliente. Se muestra en su link de estatus.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <div className="md:col-span-2">
          <label className="label-field">Cliente</label>
          <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="input-field">
            <option value="">Selecciona...</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre_empresa} — {c.estado}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label-field">Fecha aproximada</label>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="input-field" />
        </div>
        <button onClick={guardar} disabled={!clienteId || guardando} className="btn-primary">
          {guardando ? "Guardando..." : "Actualizar portal"}
        </button>
      </div>
      <div className="mt-3">
        <label className="label-field">Comentario público (visible para el cliente)</label>
        <input value={comentario} onChange={(e) => setComentario(e.target.value)} className="input-field" placeholder="Ej. Estamos grabando el contenido esta semana." />
      </div>

      {cliente && (
        <>
          <div className="mt-4 flex items-center gap-2 bg-base-900 border border-base-600 rounded-lg p-3">
            <code className="text-xs text-accent-soft break-all flex-1">{portalUrl}</code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(portalUrl);
                setCopiado(true);
                setTimeout(() => setCopiado(false), 1500);
              }}
              className="btn-secondary text-xs shrink-0"
            >
              {copiado ? "Copiado ✓" : "Copiar link"}
            </button>
          </div>

          {/* Ficha visible temporalmente */}
          <div className="mt-4 flex items-center justify-between bg-base-900 border border-base-600 rounded-lg p-3">
            <div>
              <p className="text-sm">Dejar que vea su ficha completa (PDF) en el portal</p>
              <p className="text-xs text-gray-600 mt-0.5">
                Pensado para prenderlo solo mientras haga falta — no queda permanente.
              </p>
            </div>
            <button
              onClick={alternarFicha}
              disabled={pendingFicha}
              className={`shrink-0 w-11 h-6 rounded-full relative transition-colors ${mostrarFicha ? "bg-accent" : "bg-base-600"}`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${mostrarFicha ? "translate-x-5" : "translate-x-0.5"}`}
              />
            </button>
          </div>

          {/* Banner extra / avisos con nivel de urgencia */}
          <div className="mt-4 bg-base-900 border border-base-600 rounded-lg p-3">
            <p className="text-sm mb-2">Aviso extra para su portal (aparte del comentario de etapa)</p>
            <div className="flex flex-col md:flex-row gap-2">
              <input
                value={mensajeAviso}
                onChange={(e) => setMensajeAviso(e.target.value)}
                className="input-field flex-1"
                placeholder="Ej. Vamos a estar cerrados el próximo lunes por día festivo."
              />
              <select value={nivelAviso} onChange={(e) => setNivelAviso(e.target.value as NivelUrgencia)} className="input-field md:w-40">
                <option value="informativo">Informativo</option>
                <option value="importante">Importante</option>
                <option value="urgente">Urgente</option>
              </select>
              <input
                type="number"
                min={1}
                value={horasExpira}
                onChange={(e) => setHorasExpira(e.target.value === "" ? "" : Number(e.target.value))}
                className="input-field md:w-28"
                placeholder="Horas"
              />
              <button onClick={publicarAviso} disabled={pendingAviso || !mensajeAviso.trim()} className="btn-primary shrink-0">
                Publicar
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-1.5">Déjalo vacío en "Horas" si no quieres que expire solo — lo puedes quitar manualmente cuando quieras.</p>

            {avisos.length > 0 && (
              <div className="mt-3 space-y-2">
                {avisos.map((a) => (
                  <div key={a.id} className={`flex items-center justify-between gap-2 border rounded-lg px-3 py-2 text-sm ${NIVEL_ESTILO[a.nivel]}`}>
                    <div className="min-w-0">
                      <span className="font-semibold uppercase text-xs tracking-wide">{NIVEL_LABEL[a.nivel]}</span>
                      <span className="ml-2 opacity-90">{a.mensaje}</span>
                    </div>
                    <button onClick={() => quitarAviso(a.id)} disabled={pendingAviso} className="shrink-0 opacity-70 hover:opacity-100">
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
