import clsx from "clsx";

export default function BarraMetaGlobal({ meta, clientesNuevosMes }: { meta: any; clientesNuevosMes: number }) {
  const pctClientes = Math.min(150, Math.round((clientesNuevosMes / meta.clientes_nuevos_objetivo) * 100));

  const color =
    pctClientes >= 100 ? "bg-signal-gold" : pctClientes >= 80 ? "bg-green-500" : pctClientes >= 40 ? "bg-signal-info" : "bg-base-600";

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-400">
          Meta del mes: <span className="text-gray-200 font-medium">{clientesNuevosMes} / {meta.clientes_nuevos_objetivo} clientes nuevos</span>
        </p>
        <span className="text-sm font-mono text-gray-400">{pctClientes}%</span>
      </div>
      <div className="h-2.5 bg-base-600 rounded-full overflow-hidden">
        <div className={clsx("h-full transition-all", color)} style={{ width: `${Math.min(100, pctClientes)}%` }} />
      </div>
    </div>
  );
}
