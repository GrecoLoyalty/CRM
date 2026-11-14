"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  ETAPAS_PREVENTA,
  type PreventaActualizacion,
  type PreventasConfig,
} from "@/lib/types";
import {
  eliminarActualizacion,
  guardarAvanceGlobal,
  guardarDatosBancarios,
  publicarActualizacion,
} from "@/app/dashboard/preventas/actions";

function useAccion() {
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  async function correr(fn: () => Promise<void>, textoOk: string, despues?: () => void) {
    setGuardando(true);
    setMensaje(null);
    try {
      await fn();
      setMensaje({ tipo: "ok", texto: textoOk });
      despues?.();
    } catch (e: any) {
      setMensaje({ tipo: "error", texto: e?.message || "No se pudo guardar." });
    } finally {
      setGuardando(false);
    }
  }
  return { guardando, mensaje, correr };
}

function Aviso({ m }: { m: { tipo: "ok" | "error"; texto: string } | null }) {
  if (!m) return null;
  return (
    <p
      role={m.tipo === "error" ? "alert" : "status"}
      className={`text-sm rounded-lg px-3 py-2 border ${
        m.tipo === "ok"
          ? "text-accent-soft border-accent/30 bg-accent/10"
          : "text-signal-urgent border-signal-urgent/30 bg-signal-urgent/10"
      }`}
    >
      {m.texto}
    </p>
  );
}

export default function PanelGlobalPreventas({
  config,
  actualizaciones,
}: {
  config: PreventasConfig;
  actualizaciones: PreventaActualizacion[];
}) {
  const avance = useAccion();
  const banco = useAccion();
  const novedad = useAccion();
  const [abierto, setAbierto] = useState(false);

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display font-semibold">Panel Root · Avance y pagos</h2>
          <p className="mt-1 text-sm text-gray-500">
            Lo que cambies aquí lo ven TODOS los clientes en su ticket (avance general, datos bancarios y novedades).
          </p>
        </div>
        <button type="button" onClick={() => setAbierto((a) => !a)} aria-expanded={abierto} className="btn-secondary">
          {abierto ? "Ocultar" : "Gestionar"}
        </button>
      </div>

      {!abierto ? (
        <dl className="mt-4 grid grid-cols-1 gap-3 border-t border-base-700 pt-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-gray-500">Etapa actual</dt>
            <dd className="mt-1 text-sm text-gray-200">
              {config.etapa_actual}/5 · {ETAPAS_PREVENTA[config.etapa_actual - 1]?.label}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Envío estimado</dt>
            <dd className="mt-1 text-sm text-gray-200">
              {config.fecha_estimada_envio
                ? format(new Date(config.fecha_estimada_envio + "T00:00:00"), "d 'de' MMMM, yyyy", { locale: es })
                : "Sin definir"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Datos bancarios</dt>
            <dd className="mt-1 text-sm text-gray-200">
              {config.clabe || config.numero_cuenta ? `${config.banco || "Banco"} · configurados` : (
                <span className="text-signal-warn">Faltan — el cliente no verá a dónde pagar</span>
              )}
            </dd>
          </div>
        </dl>
      ) : (
        <div className="mt-5 space-y-8 border-t border-base-700 pt-5">
          {/* Avance global */}
          <form
            action={(fd) => avance.correr(() => guardarAvanceGlobal(fd), "Avance actualizado para todos los clientes.")}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            <h3 className="sm:col-span-2 text-sm font-medium text-gray-200">Avance general</h3>
            <div>
              <label className="label-field" htmlFor="pg-etapa">Etapa actual</label>
              <select id="pg-etapa" name="etapa_actual" defaultValue={config.etapa_actual} className="input-field">
                {ETAPAS_PREVENTA.map((e) => (
                  <option key={e.n} value={e.n}>{e.n}. {e.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-field" htmlFor="pg-fecha">Fecha estimada de envío</label>
              <input id="pg-fecha" name="fecha_estimada_envio" type="date" defaultValue={config.fecha_estimada_envio || ""} className="input-field" />
            </div>
            <div className="sm:col-span-2">
              <label className="label-field" htmlFor="pg-msg">Mensaje general (opcional)</label>
              <textarea id="pg-msg" name="mensaje_general" rows={2} defaultValue={config.mensaje_general || ""} className="input-field" />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Aviso m={avance.mensaje} />
              <button type="submit" disabled={avance.guardando} className="btn-primary">
                {avance.guardando ? "Guardando..." : "Guardar avance"}
              </button>
            </div>
          </form>

          {/* Datos bancarios */}
          <form
            action={(fd) => banco.correr(() => guardarDatosBancarios(fd), "Datos bancarios guardados.")}
            className="grid grid-cols-1 gap-4 border-t border-base-700 pt-6 sm:grid-cols-2"
          >
            <h3 className="sm:col-span-2 text-sm font-medium text-gray-200">
              Datos bancarios <span className="text-gray-500 font-normal">(solo se muestran a clientes que aún no pagan)</span>
            </h3>
            <div>
              <label className="label-field" htmlFor="pg-banco">Banco</label>
              <input id="pg-banco" name="banco" defaultValue={config.banco || ""} className="input-field" />
            </div>
            <div>
              <label className="label-field" htmlFor="pg-titular">Titular de la cuenta</label>
              <input id="pg-titular" name="titular" defaultValue={config.titular || ""} className="input-field" />
            </div>
            <div>
              <label className="label-field" htmlFor="pg-clabe">CLABE (18 dígitos)</label>
              <input id="pg-clabe" name="clabe" inputMode="numeric" maxLength={22} defaultValue={config.clabe || ""} className="input-field font-mono" />
            </div>
            <div>
              <label className="label-field" htmlFor="pg-cuenta">Número de cuenta / tarjeta (opcional)</label>
              <input id="pg-cuenta" name="numero_cuenta" defaultValue={config.numero_cuenta || ""} className="input-field font-mono" />
            </div>
            <div className="sm:col-span-2">
              <label className="label-field" htmlFor="pg-instr">Instrucciones de pago (opcional)</label>
              <textarea
                id="pg-instr"
                name="instrucciones_pago"
                rows={2}
                placeholder="Ej: Envía tu comprobante por WhatsApp al 55..."
                defaultValue={config.instrucciones_pago || ""}
                className="input-field"
              />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Aviso m={banco.mensaje} />
              <button type="submit" disabled={banco.guardando} className="btn-primary">
                {banco.guardando ? "Guardando..." : "Guardar datos bancarios"}
              </button>
            </div>
          </form>

          {/* Novedades */}
          <div className="border-t border-base-700 pt-6 space-y-4">
            <h3 className="text-sm font-medium text-gray-200">Novedades para los clientes</h3>
            <form
              action={(fd) =>
                novedad.correr(() => publicarActualizacion(fd), "Novedad publicada.", () => {
                  (document.getElementById("pg-nov-form") as HTMLFormElement | null)?.reset();
                })
              }
              id="pg-nov-form"
              className="grid grid-cols-1 gap-3"
            >
              <div>
                <label className="label-field" htmlFor="pg-nov-titulo">Título</label>
                <input id="pg-nov-titulo" name="titulo" required className="input-field" />
              </div>
              <div>
                <label className="label-field" htmlFor="pg-nov-msg">Detalle (opcional)</label>
                <textarea id="pg-nov-msg" name="mensaje" rows={2} className="input-field" />
              </div>
              <Aviso m={novedad.mensaje} />
              <button type="submit" disabled={novedad.guardando} className="btn-primary sm:w-fit">
                {novedad.guardando ? "Publicando..." : "Publicar novedad"}
              </button>
            </form>

            {actualizaciones.length > 0 && (
              <ul className="divide-y divide-base-700 border-y border-base-700">
                {actualizaciones.map((a) => (
                  <li key={a.id} className="py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-gray-200">{a.titulo}</p>
                      {a.mensaje && <p className="text-xs text-gray-500 mt-0.5">{a.mensaje}</p>}
                      <p className="text-[11px] text-gray-600 mt-1">
                        {format(new Date(a.created_at), "d MMM yyyy, HH:mm", { locale: es })}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm("¿Eliminar esta novedad? Dejará de verse en los tickets.")) {
                          novedad.correr(() => eliminarActualizacion(a.id), "Novedad eliminada.");
                        }
                      }}
                      className="btn-ghost text-xs shrink-0"
                    >
                      Eliminar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
