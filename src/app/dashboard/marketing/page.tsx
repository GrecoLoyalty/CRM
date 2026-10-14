import Link from "next/link";

const SECCIONES = [
  { href: "/dashboard/marketing/calendario", titulo: "Calendario de contenido", detalle: "Planea fechas, canales, responsables y materiales.", icono: "◷" },
  { href: "/dashboard/marketing/guiones", titulo: "Guiones", detalle: "Escribe escenas, ganchos y llamados a la acción.", icono: "✎" },
  { href: "/dashboard/marketing/marcas", titulo: "Marcas", detalle: "Organiza colores, logos y plataformas activas.", icono: "◈" },
  { href: "/dashboard/marketing/para-publicar", titulo: "Para publicar", detalle: "Abre videos asignados y completa publicaciones.", icono: "↗" },
];

export default function MarketingPage() {
  return <div className="max-w-5xl mx-auto space-y-6">
    <header>
      <p className="text-xs uppercase tracking-[0.14em] text-accent-soft">Análisis · logística · estrategia</p>
      <h2 className="text-2xl font-display font-semibold mt-1">Estrategia de contenido</h2>
      <p className="text-sm text-gray-500 mt-1">El equipo de Análisis coordina la planeación de contenido para todas las marcas y equipos.</p>
    </header>
    <div className="grid gap-3 sm:grid-cols-2">
      {SECCIONES.map((seccion) => <Link key={seccion.href} href={seccion.href} className="card-link p-5 flex gap-4 items-start">
        <span className="w-10 h-10 rounded-xl bg-accent/10 text-accent-soft flex items-center justify-center text-xl shrink-0">{seccion.icono}</span>
        <span><span className="block font-semibold text-gray-100">{seccion.titulo}</span><span className="block text-sm text-gray-500 mt-1">{seccion.detalle}</span></span>
      </Link>)}
    </div>
  </div>;
}
