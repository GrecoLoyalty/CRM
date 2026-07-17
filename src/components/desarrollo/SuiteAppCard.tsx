import clsx from "clsx";

const ESTADO_ESTILO: Record<string, string> = {
  Disponible: "bg-green-500/15 text-green-400",
  "En uso": "bg-signal-warn/15 text-signal-warn",
  "En mantenimiento": "bg-signal-urgent/15 text-signal-urgent",
};

export default function SuiteAppCard({ app }: { app: any }) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <p className="font-medium">{app.nombre}</p>
        <span className={clsx("text-xs px-2 py-0.5 rounded-full", ESTADO_ESTILO[app.estado])}>{app.estado}</span>
      </div>
      <p className="text-xs text-gray-500 mt-1">{app.categoria_negocio}</p>
      <p className="text-sm text-gray-400 mt-2 line-clamp-2">{app.descripcion}</p>
      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-gray-600">Reutilizada {app.veces_reutilizada}x</span>
        {app.repo_url && (
          <a href={app.repo_url} target="_blank" className="text-xs text-accent-soft underline">
            Ver repo
          </a>
        )}
      </div>
    </div>
  );
}
