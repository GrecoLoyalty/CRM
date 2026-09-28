"use client";

import { useState, useTransition } from "react";
import { guardarConfiguracionEmpresa } from "@/app/dashboard/root/actions";

interface ConfiguracionEmpresa {
  nombre_empresa: string;
  giro: string | null;
  telefono: string | null;
  correo: string | null;
  sitio_web: string | null;
  direccion: string | null;
  moneda: string;
  costos_fijos_mensuales: number | string;
  costos_variables_pct: number | string;
  tasa_impuestos_pct: number | string;
}

interface MovimientoReporte {
  tipo: "ingreso" | "egreso";
  monto: number | string;
  fecha: string;
}

const CAMPOS_CONFIG: { name: keyof ConfiguracionEmpresa; label: string; type?: string }[] = [
  { name: "nombre_empresa", label: "Nombre de la empresa" },
  { name: "giro", label: "Industria o giro" },
  { name: "telefono", label: "Teléfono", type: "tel" },
  { name: "correo", label: "Correo", type: "email" },
  { name: "sitio_web", label: "Sitio web", type: "url" },
  { name: "direccion", label: "Dirección" },
];

function obtenerReporte(movimientos: MovimientoReporte[], moneda: string) {
  const hoy = new Date();
  const meses = Array.from({ length: 12 }, (_, indice) => {
    const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - (11 - indice), 1);
    const mes = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
    return {
      mes,
      etiqueta: new Intl.DateTimeFormat("es-MX", { month: "short", year: "numeric" }).format(fecha),
      ingresos: 0,
      egresos: 0,
    };
  });
  const porMes = new Map(meses.map((mes) => [mes.mes, mes]));

  for (const movimiento of movimientos) {
    const mes = porMes.get(movimiento.fecha.slice(0, 7));
    if (!mes) continue;
    if (movimiento.tipo === "ingreso") mes.ingresos += Number(movimiento.monto);
    else mes.egresos += Number(movimiento.monto);
  }

  const formatter = new Intl.NumberFormat("es-MX", { style: "currency", currency: moneda, maximumFractionDigits: 0 });
  return meses.map((mes) => {
    const resultado = mes.ingresos - mes.egresos;
    return { ...mes, resultado, margen: mes.ingresos > 0 ? (resultado / mes.ingresos) * 100 : null, formatter };
  });
}

export default function EmpresaReportes({
  configuracion,
  movimientos,
}: {
  configuracion: ConfiguracionEmpresa | null;
  movimientos: MovimientoReporte[];
}) {
  const [guardando, startTransition] = useTransition();
  const [mensaje, setMensaje] = useState<string | null>(null);
  const moneda = "MXN";
  const reporte = obtenerReporte(movimientos, moneda);
  const totalIngresos = reporte.reduce((total, mes) => total + mes.ingresos, 0);
  const totalEgresos = reporte.reduce((total, mes) => total + mes.egresos, 0);
  const resultado = totalIngresos - totalEgresos;
  const margen = totalIngresos > 0 ? (resultado / totalIngresos) * 100 : null;
  const actual = reporte[reporte.length - 1];
  const costosFijos = Number(configuracion?.costos_fijos_mensuales || 0);
  const costosVariablesPct = Number(configuracion?.costos_variables_pct || 0);
  const tasaImpuestosPct = Number(configuracion?.tasa_impuestos_pct || 0);
  const puntoEquilibrio = costosFijos / (1 - costosVariablesPct / 100);
  const reservaFiscal = Math.max(actual.resultado, 0) * (tasaImpuestosPct / 100);
  const formato = new Intl.NumberFormat("es-MX", { style: "currency", currency: moneda, maximumFractionDigits: 0 });

  function guardar(formData: FormData) {
    setMensaje(null);
    startTransition(async () => {
      try {
        await guardarConfiguracionEmpresa(formData);
        setMensaje("Información guardada.");
      } catch (error) {
        setMensaje(error instanceof Error ? error.message : "No se pudo guardar la información.");
      }
    });
  }

  function exportarCsv() {
    const filas = [
      ["Mes", "Ingresos", "Egresos", "Resultado neto", "Margen neto (%)"],
      ...reporte.map((mes) => [mes.etiqueta, mes.ingresos.toFixed(2), mes.egresos.toFixed(2), mes.resultado.toFixed(2), mes.margen?.toFixed(2) ?? ""]),
    ];
    const contenido = filas.map((fila) => fila.map((valor) => `"${String(valor).replaceAll('"', '""')}"`).join(",")).join("\n");
    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(new Blob([`\uFEFF${contenido}`], { type: "text/csv;charset=utf-8" }));
    enlace.download = "reporte-empresa-12-meses.csv";
    enlace.click();
    URL.revokeObjectURL(enlace.href);
  }

  return (
    <div className="space-y-6">
      <section className="card p-5">
        <div className="mb-4">
          <h2 className="font-display font-semibold">Información de la empresa</h2>
          <p className="mt-1 text-sm text-gray-500">Los supuestos se usan para estimaciones de gestión, no sustituyen la contabilidad fiscal.</p>
        </div>
        <form action={guardar} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CAMPOS_CONFIG.map((campo) => (
            <div key={campo.name} className={campo.name === "direccion" ? "sm:col-span-2 lg:col-span-3" : ""}>
              <label htmlFor={campo.name} className="label-field">{campo.label}</label>
              <input
                id={campo.name}
                name={campo.name}
                type={campo.type || "text"}
                defaultValue={configuracion?.[campo.name] || ""}
                required={campo.name === "nombre_empresa"}
                className="input-field"
              />
            </div>
          ))}
          <input type="hidden" name="moneda" value="MXN" />
          <div>
            <span className="label-field">Moneda de reportes</span>
            <p className="input-field flex items-center text-gray-400">MXN — Peso mexicano</p>
          </div>
          <div>
            <label htmlFor="costos_fijos_mensuales" className="label-field">Costos fijos mensuales</label>
            <input id="costos_fijos_mensuales" name="costos_fijos_mensuales" type="number" min="0" step="0.01" defaultValue={configuracion?.costos_fijos_mensuales || 0} required className="input-field" />
          </div>
          <div>
            <label htmlFor="costos_variables_pct" className="label-field">Costos variables (% de ingresos)</label>
            <input id="costos_variables_pct" name="costos_variables_pct" type="number" min="0" max="99.99" step="0.01" defaultValue={configuracion?.costos_variables_pct || 0} required className="input-field" />
          </div>
          <div>
            <label htmlFor="tasa_impuestos_pct" className="label-field">Tasa para reserva fiscal estimada (%)</label>
            <input id="tasa_impuestos_pct" name="tasa_impuestos_pct" type="number" min="0" max="100" step="0.01" defaultValue={configuracion?.tasa_impuestos_pct || 0} required className="input-field" />
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={guardando} className="btn-primary w-full">{guardando ? "Guardando..." : "Guardar información"}</button>
          </div>
          {mensaje && <p role="status" className="text-sm text-gray-300 sm:col-span-2 lg:col-span-3">{mensaje}</p>}
        </form>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display font-semibold">Reporte financiero</h2>
            <p className="mt-1 text-sm text-gray-500">Movimientos de caja de los últimos 12 meses · base de efectivo</p>
          </div>
          <button type="button" onClick={exportarCsv} className="btn-secondary">Descargar CSV</button>
        </div>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Indicador titulo="Ingresos · 12 meses" valor={formato.format(totalIngresos)} />
          <Indicador titulo="Egresos · 12 meses" valor={formato.format(totalEgresos)} />
          <Indicador titulo="Resultado neto · 12 meses" valor={formato.format(resultado)} destacado={resultado >= 0} />
          <Indicador titulo="Margen neto · 12 meses" valor={margen === null ? "—" : `${margen.toFixed(1)}%`} />
          <Indicador titulo="Punto de equilibrio mensual" valor={formato.format(puntoEquilibrio)} />
          <Indicador titulo="Reserva fiscal estimada · mes actual" valor={formato.format(reservaFiscal)} />
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="border-b border-base-600 text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">Mes</th>
                  <th className="px-4 py-3 text-right font-medium">Ingresos</th>
                  <th className="px-4 py-3 text-right font-medium">Egresos</th>
                  <th className="px-4 py-3 text-right font-medium">Resultado</th>
                  <th className="px-4 py-3 text-right font-medium">Margen</th>
                </tr>
              </thead>
              <tbody>
                {reporte.map((mes) => (
                  <tr key={mes.mes} className="border-b border-base-700 last:border-0">
                    <td className="px-4 py-3 capitalize">{mes.etiqueta}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formato.format(mes.ingresos)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formato.format(mes.egresos)}</td>
                    <td className={`px-4 py-3 text-right tabular-nums ${mes.resultado < 0 ? "text-signal-urgent" : "text-accent-soft"}`}>{formato.format(mes.resultado)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{mes.margen === null ? "—" : `${mes.margen.toFixed(1)}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-xs text-gray-600">Resultado = ingresos registrados − egresos registrados. Punto de equilibrio = costos fijos ÷ (1 − costos variables %). La reserva fiscal es una estimación aplicada al resultado positivo del mes actual.</p>
      </section>
    </div>
  );
}

function Indicador({ titulo, valor, destacado }: { titulo: string; valor: string; destacado?: boolean }) {
  return (
    <div className="card min-w-0 p-4">
      <p className="text-xs text-gray-500">{titulo}</p>
      <p className={`mt-2 truncate font-display text-lg font-semibold tabular-nums ${destacado === false ? "text-signal-urgent" : "text-gray-100"}`}>{valor}</p>
    </div>
  );
}