"use client";

import GraficaBarras from "@/components/shared/GraficaBarras";
import GraficaLinea from "@/components/shared/GraficaLinea";
import type { EstadisticasEquipo as EstadisticasEquipoData } from "@/lib/estadisticas";

const formatoMoneda = (v: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(v);

export default function EstadisticasEquipo({ datos }: { datos: EstadisticasEquipoData }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="card p-4 sm:p-5">
        <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Tiempo en el CRM</p>
        <p className="text-xs text-gray-600 mb-3">Horas activas por persona, últimos 7 días</p>
        <GraficaBarras
          datos={datos.tiempoPorPersona.map((p) => ({ etiqueta: p.nombre.split(" ")[0], valor: p.horas }))}
          formatearValor={(v) => `${v}h`}
        />
      </div>

      <div className="card p-4 sm:p-5">
        <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Ventas</p>
        <p className="text-xs text-gray-600 mb-3">Ingresos por venta, por mes</p>
        <GraficaBarras
          datos={datos.ventasPorMes.map((p) => ({ etiqueta: p.etiqueta, valor: p.total }))}
          colorBarra="#5FC4BE"
          formatearValor={(v) => formatoMoneda(v)}
        />
      </div>

      <div className="card p-4 sm:p-5">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs uppercase tracking-wide text-gray-500">Flujo de caja</p>
          <span className={`text-xs font-semibold ${datos.saldoActual >= 0 ? "text-accent-soft" : "text-signal-urgent"}`}>
            {formatoMoneda(datos.saldoActual)}
          </span>
        </div>
        <p className="text-xs text-gray-600 mb-3">Saldo acumulado, por mes</p>
        <GraficaLinea
          datos={datos.flujoCajaPorMes.map((p) => ({ etiqueta: p.etiqueta, valor: p.total }))}
          formatearValor={(v) => formatoMoneda(v)}
        />
      </div>
    </div>
  );
}
