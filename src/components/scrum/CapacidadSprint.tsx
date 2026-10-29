import { fmtHoras, type ResumenCapacidad } from "@/lib/scrum";

function Barra({ valor, max, alerta }: { valor: number; max: number; alerta?: boolean }) {
  const pct = max > 0 ? Math.min(100, Math.round((valor / max) * 100)) : 0;
  return (
    <div className="h-2 rounded-full bg-base-700 overflow-hidden">
      <div className={`h-full rounded-full ${alerta ? "bg-signal-urgent" : "bg-accent"}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function CapacidadSprint({ c, pctClientesMeta }: { c: ResumenCapacidad; pctClientesMeta: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="space-y-1.5">
        <p className="kpi-etiqueta">Planeado vs. capacidad</p>
        <p className={`text-xl font-display font-semibold tabular-nums ${c.planeadas > c.disponible ? "text-signal-urgent" : ""}`}>
          {fmtHoras(c.planeadas)} <span className="text-sm text-gray-500">de {fmtHoras(c.disponible)}</span>
        </p>
        <Barra valor={c.planeadas} max={c.disponible} alerta={c.planeadas > c.disponible} />
        <p className="text-[11px] text-gray-500">
          Equipo: {fmtHoras(c.bruta)} en el sprint, menos {fmtHoras(c.colchon)} de colchón.
          {c.sinEstimar > 0 ? ` ${c.sinEstimar} tarjeta(s) sin estimar.` : ""}
        </p>
      </div>
      <div className="space-y-1.5">
        <p className="kpi-etiqueta">Colchón de urgencias</p>
        <p className={`text-xl font-display font-semibold tabular-nums ${c.urgencias > c.colchon ? "text-signal-urgent" : ""}`}>
          {fmtHoras(c.urgencias)} <span className="text-sm text-gray-500">de {fmtHoras(c.colchon)}</span>
        </p>
        <Barra valor={c.urgencias} max={c.colchon} alerta={c.urgencias > c.colchon} />
        <p className="text-[11px] text-gray-500">
          {c.restoColchon >= 0 ? `Quedan ${fmtHoras(c.restoColchon)} para imprevistos.` : "El colchón se agotó: algo del plan debe salir."}
        </p>
      </div>
      <div className="space-y-1.5">
        <p className="kpi-etiqueta">Clientes vs. interno</p>
        <p className="text-xl font-display font-semibold tabular-nums">
          {c.pctClientesReal}% <span className="text-sm text-gray-500">meta {pctClientesMeta}% clientes</span>
        </p>
        <Barra valor={c.pctClientesReal} max={100} alerta={c.planeadas > 0 && c.pctClientesReal < pctClientesMeta - 10} />
        <p className="text-[11px] text-gray-500">
          Clientes {fmtHoras(c.horasClientes)} · Interno {fmtHoras(c.horasInternas)}
        </p>
      </div>
    </div>
  );
}
