import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { differenceInCalendarDays, format } from "date-fns";
import { es } from "date-fns/locale";
import { createServiceClient } from "@/lib/supabase/server";
import { ETAPAS_PREVENTA, formatoMXN } from "@/lib/types";

// Ticket público de la preventa: sin login, entra por token único.
// Dinámico para que el avance global (que Root cambia a mano) siempre
// se vea actualizado, y sin indexar en buscadores.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = {
  title: "Seguimiento de tu pedido · GRESANOVA",
  robots: { index: false, follow: false },
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fechaLarga(iso: string, conHora = false) {
  return format(new Date(iso), conHora ? "d 'de' MMMM, yyyy · HH:mm" : "d 'de' MMMM, yyyy", { locale: es });
}

export default async function TicketPreventaPage({ params }: { params: { token: string } }) {
  if (!UUID_RE.test(params.token)) notFound();

  const supabase = createServiceClient();

  // Se piden solo los campos que el cliente puede ver: nunca teléfono,
  // correo ni quién vendió.
  const { data: p } = await supabase
    .from("preventas")
    .select(
      "folio, nombre_cliente, nombre_negocio, producto, cantidad, monto_total, monto_anticipo, anticipo_pagado, pago_fecha, estado, created_at"
    )
    .eq("ticket_token", params.token)
    .single();

  if (!p) notFound();

  const [{ data: config }, { data: novedades }] = await Promise.all([
    supabase.from("preventas_config").select("*").eq("id", "principal").single(),
    supabase
      .from("preventas_actualizaciones")
      .select("id, titulo, mensaje, created_at")
      .eq("publicada", true)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const cancelada = p.estado === "cancelada";
  const etapa = Math.min(Math.max(config?.etapa_actual ?? 1, 1), ETAPAS_PREVENTA.length);
  const pct = Math.round((etapa / ETAPAS_PREVENTA.length) * 100);

  const fechaEnvio = config?.fecha_estimada_envio ? new Date(config.fecha_estimada_envio + "T00:00:00") : null;
  const diasRestantes = fechaEnvio ? differenceInCalendarDays(fechaEnvio, new Date()) : null;

  const saldo = Math.max(Number(p.monto_total) - Number(p.monto_anticipo), 0);
  const hayDatosBancarios = Boolean(config?.clabe || config?.numero_cuenta);

  return (
    <main className="min-h-screen bg-base-900 text-gray-100 px-4 sm:px-6 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center font-display font-bold text-base-900">G</div>
          <span className="font-display text-lg tracking-tight">GRESANOVA</span>
        </div>

        {/* Encabezado tipo ticket */}
        <div className="card p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Ticket de preventa</p>
              <h1 className="text-2xl font-display font-semibold mt-1">{p.nombre_negocio}</h1>
              <p className="text-sm text-gray-400 mt-1">Hola, {p.nombre_cliente.split(" ")[0]}. Aquí puedes seguir tu pedido.</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Folio</p>
              <p className="font-mono text-lg">{p.folio}</p>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-dashed border-base-600 pt-5 text-sm">
            <div>
              <dt className="text-xs text-gray-500">Producto</dt>
              <dd className="mt-0.5 text-gray-200">{p.cantidad} × {p.producto}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Fecha de la preventa</dt>
              <dd className="mt-0.5 text-gray-200">{fechaLarga(p.created_at)}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Total del pedido</dt>
              <dd className="mt-0.5 text-gray-200">{formatoMXN(p.monto_total)}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Anticipo</dt>
              <dd className="mt-0.5 text-gray-200">{formatoMXN(p.monto_anticipo)}</dd>
            </div>
            {saldo > 0 && (
              <div>
                <dt className="text-xs text-gray-500">Saldo restante</dt>
                <dd className="mt-0.5 text-gray-200">{formatoMXN(saldo)}</dd>
              </div>
            )}
          </dl>
        </div>

        {cancelada && (
          <div role="status" className="mt-6 border border-signal-urgent/30 bg-signal-urgent/10 text-signal-urgent rounded-lg px-4 py-3 text-sm">
            Esta preventa fue cancelada. Si crees que es un error, contacta a tu ejecutivo en GRESANOVA.
          </div>
        )}

        {/* Pago */}
        {!cancelada && (
          p.anticipo_pagado ? (
            <div role="status" className="mt-6 border border-green-500/30 bg-green-500/10 rounded-lg px-4 py-3 text-sm text-green-400">
              <span className="font-medium">Anticipo recibido</span>
              {p.pago_fecha ? ` · ${fechaLarga(p.pago_fecha)}` : ""}. ¡Gracias!
            </div>
          ) : (
            <section className="mt-6 card p-6 border-signal-warn/40" aria-labelledby="pago-heading">
              <p className="text-xs uppercase tracking-wide text-signal-warn">Pago pendiente</p>
              <h2 id="pago-heading" className="text-lg font-display font-semibold mt-1">
                Anticipo a depositar: {formatoMXN(p.monto_anticipo)}
              </h2>
              {hayDatosBancarios ? (
                <dl className="mt-4 space-y-3 text-sm">
                  {config?.banco && (
                    <div className="flex justify-between gap-4"><dt className="text-gray-500">Banco</dt><dd className="text-gray-200 text-right">{config.banco}</dd></div>
                  )}
                  {config?.titular && (
                    <div className="flex justify-between gap-4"><dt className="text-gray-500">Titular</dt><dd className="text-gray-200 text-right">{config.titular}</dd></div>
                  )}
                  {config?.clabe && (
                    <div className="flex justify-between gap-4"><dt className="text-gray-500">CLABE</dt><dd className="text-gray-200 text-right font-mono select-all">{config.clabe}</dd></div>
                  )}
                  {config?.numero_cuenta && (
                    <div className="flex justify-between gap-4"><dt className="text-gray-500">Cuenta / tarjeta</dt><dd className="text-gray-200 text-right font-mono select-all">{config.numero_cuenta}</dd></div>
                  )}
                  <div className="flex justify-between gap-4"><dt className="text-gray-500">Concepto / referencia</dt><dd className="text-gray-200 text-right font-mono select-all">{p.folio}</dd></div>
                </dl>
              ) : (
                <p className="mt-3 text-sm text-gray-400">
                  Tu ejecutivo te compartirá los datos para realizar el depósito.
                </p>
              )}
              {config?.instrucciones_pago && <p className="mt-4 text-sm text-gray-300 border-t border-base-700 pt-3">{config.instrucciones_pago}</p>}
              <p className="mt-4 text-xs text-gray-500">
                Cuando se refleje tu pago, este ticket se actualizará automáticamente.
              </p>
            </section>
          )
        )}

        {/* Avance general */}
        {!cancelada && (
          <section className="mt-6 card p-6" aria-labelledby="avance-heading">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Avance de tu pedido</p>
                <h2 id="avance-heading" className="text-lg font-display font-semibold mt-1">
                  {ETAPAS_PREVENTA[etapa - 1].label}
                </h2>
              </div>
              <p className="text-3xl font-display font-semibold tabular-nums">{pct}%</p>
            </div>

            <div
              className="mt-4 h-2 rounded-full bg-base-600 overflow-hidden"
              role="progressbar"
              aria-label="Avance del pedido"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
            >
              <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${pct}%` }} />
            </div>

            {fechaEnvio && (
              <div className="mt-5 border-l-2 border-accent/70 pl-3">
                <p className="text-xs text-gray-500">Envío estimado</p>
                <p className="text-sm text-gray-100 mt-0.5">
                  {format(fechaEnvio, "d 'de' MMMM, yyyy", { locale: es })}
                  {diasRestantes !== null && (
                    <span className="text-gray-400">
                      {diasRestantes > 1 && ` · faltan ${diasRestantes} días`}
                      {diasRestantes === 1 && " · falta 1 día"}
                      {diasRestantes === 0 && " · es hoy"}
                      {diasRestantes < 0 && " · fecha en revisión, pronto te compartimos novedades"}
                    </span>
                  )}
                </p>
              </div>
            )}

            {config?.mensaje_general && <p className="mt-4 text-sm text-gray-300">{config.mensaje_general}</p>}

            <ol className="relative border-l border-base-600 ml-3 mt-6 space-y-6">
              {ETAPAS_PREVENTA.map((e) => {
                const alcanzada = e.n <= etapa;
                const actual = e.n === etapa;
                return (
                  <li key={e.n} className="ml-6" aria-current={actual ? "step" : undefined}>
                    <span
                      className={`absolute -left-[9px] w-4 h-4 rounded-full border-2 ${
                        alcanzada ? "bg-accent border-accent" : "bg-base-800 border-base-600"
                      }`}
                    />
                    <p className={alcanzada ? "font-medium" : "text-gray-500"}>{e.label}</p>
                    {actual && <p className="text-sm text-gray-400 mt-0.5">{e.detalle}</p>}
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {/* Novedades */}
        {novedades && novedades.length > 0 && (
          <section className="mt-6 card p-6" aria-labelledby="novedades-heading">
            <h2 id="novedades-heading" className="text-xs uppercase tracking-wide text-gray-500 mb-3">Novedades</h2>
            <ul className="divide-y divide-base-700">
              {novedades.map((n) => (
                <li key={n.id} className="py-3 first:pt-0 last:pb-0">
                  <p className="text-xs text-gray-500">{fechaLarga(n.created_at)}</p>
                  <p className="text-sm text-gray-100 mt-0.5">{n.titulo}</p>
                  {n.mensaje && <p className="text-sm text-gray-400 mt-1">{n.mensaje}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="text-center text-xs text-gray-600 mt-10">
          ¿Dudas sobre tu pedido? Contacta a tu ejecutivo de GRESANOVA y menciona tu folio {p.folio}.
        </p>
      </div>
    </main>
  );
}
