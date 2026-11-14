import type { IconName } from "@/components/ui/Icon";

export type Item = { href: string; label: string; icon: IconName; paso?: number; children?: Item[] };
export type Grupo = { titulo?: string; items: Item[] };

// Una sola línea de trabajo:
//   Flujo de producción (cliente de principio a fin) → Mi trabajo (lo mío del día) → Dirección.
const MI_TRABAJO: Item[] = [
  { href: "/dashboard/mis-tareas", label: "Mis tareas", icon: "tareas" },
  { href: "/dashboard/tickets", label: "Tickets", icon: "tickets" },
  { href: "/dashboard/calendario", label: "Calendario", icon: "calendario" },
  { href: "/dashboard/marketing/para-publicar", label: "Para publicar", icon: "calendario" },
  { href: "/dashboard/pizarron", label: "Pizarrón", icon: "pizarron" },
];

// El contenido (planificar, guiones, marcas) cuelga directo de Análisis:
// antes había una pantalla intermedia que solo repetía estos tres enlaces.
const CONTENIDO: Item[] = [
  { href: "/dashboard/marketing/calendario", label: "Planificar y asignar", icon: "calendario" },
  { href: "/dashboard/marketing/guiones", label: "Guiones", icon: "analisis" },
  { href: "/dashboard/marketing/marcas", label: "Marcas", icon: "analisis" },
];

const ANALISIS: Item = {
  href: "/dashboard/analisis",
  label: "Análisis",
  icon: "analisis",
  paso: 2,
  children: CONTENIDO,
};

const FLUJO: Item[] = [
  { href: "/dashboard/ventas", label: "Ventas", icon: "ventas", paso: 1 },
  ANALISIS,
  { href: "/dashboard/estetica", label: "Estética Visual", icon: "estetica", paso: 3 },
  { href: "/dashboard/desarrollo", label: "Desarrollo", icon: "desarrollo", paso: 4 },
];

const DIRECCION: Item[] = [
  { href: "/dashboard/ceo", label: "Vista de Águila", icon: "aguila" },
  { href: "/dashboard/ceo/tareas", label: "Asignar tarea", icon: "asignar" },
  { href: "/dashboard/ceo/boveda", label: "Bóveda", icon: "boveda" },
];

const PREVENTAS: Item = { href: "/dashboard/preventas", label: "Preventas", icon: "paquete" };

const VISTA_EJECUTIVA: Item = { href: "/dashboard/ceo", label: "Vista de Águila", icon: "aguila" };

export const NAV_POR_ROL: Record<string, Grupo[]> = {
  root: [
    {
      items: [
        { href: "/dashboard/root", label: "Panel Root", icon: "escudo" },
        { href: "/dashboard/root/clientes", label: "Clientes", icon: "clientes" },
        { href: "/dashboard/root/empresa", label: "Empresa y reportes", icon: "aguila" },
      ],
    },
    { titulo: "Flujo de producción", items: FLUJO },
    { titulo: "Venta de productos", items: [PREVENTAS] },
    { titulo: "Mi trabajo", items: MI_TRABAJO },
    { titulo: "Dirección", items: DIRECCION },
  ],
  ceo: [
    { titulo: "Flujo de producción", items: FLUJO },
    { titulo: "Venta de productos", items: [PREVENTAS] },
    { titulo: "Mi trabajo", items: MI_TRABAJO },
    { titulo: "Dirección", items: DIRECCION },
  ],
  analista: [
    { titulo: "Flujo de producción", items: [ANALISIS, VISTA_EJECUTIVA] },
    { titulo: "Mi trabajo", items: MI_TRABAJO },
  ],
  vendedor: [
    { titulo: "Flujo de producción", items: [{ href: "/dashboard/ventas", label: "Ventas", icon: "ventas" }, VISTA_EJECUTIVA] },
    { titulo: "Venta de productos", items: [PREVENTAS] },
    { titulo: "Mi trabajo", items: MI_TRABAJO },
  ],
  produccion: [
    {
      titulo: "Flujo de producción",
      items: [
        { href: "/dashboard/estetica", label: "Estética Visual", icon: "estetica" },
        { href: "/dashboard/desarrollo", label: "Desarrollo", icon: "desarrollo" },
        VISTA_EJECUTIVA,
      ],
    },
    { titulo: "Mi trabajo", items: MI_TRABAJO },
  ],
  marketing: [
    { titulo: "Flujo de producción", items: [ANALISIS] },
    { titulo: "Mi trabajo", items: MI_TRABAJO },
  ],
};

/* Rutas que no están en el menú pero sí necesitan título en la cabecera */
const TITULOS_EXTRA: { href: string; label: string }[] = [
  { href: "/dashboard/cliente", label: "Ficha de cliente" },
  { href: "/dashboard", label: "Inicio" },
];

/**
 * Devuelve el href del elemento de menú activo.
 * Gana la ruta más específica, para que /dashboard/ceo/boveda no
 * encienda además "Vista de Águila" (/dashboard/ceo).
 */
export function resolverActivo(
  pathname: string | null,
  grupos: Grupo[]
): string | null {
  if (!pathname) return null;
  const hrefs = grupos.flatMap((g) => g.items.flatMap((item) => [
    item.href,
    ...(item.children?.map((child) => child.href) || []),
  ]));
  const coincidencias = hrefs.filter(
    (h) => pathname === h || pathname.startsWith(h + "/")
  );
  if (coincidencias.length === 0) return null;
  return coincidencias.reduce((a, b) => (b.length > a.length ? b : a));
}

/** Nombre legible de la sección actual, para la cabecera. */
export function tituloDeRuta(pathname: string | null, role: string): string {
  if (!pathname) return "Inicio";

  const items = (NAV_POR_ROL[role] || []).flatMap((g) => g.items.flatMap((i) => [i, ...(i.children || [])]));
  const candidatos: { href: string; label: string }[] = [
    ...items.map((i) => ({ href: i.href, label: i.label })),
    ...TITULOS_EXTRA,
  ];

  const coincidencias = candidatos.filter(
    (c) => pathname === c.href || pathname.startsWith(c.href + "/")
  );
  if (coincidencias.length === 0) return "Inicio";

  return coincidencias.reduce((a, b) => (b.href.length > a.href.length ? b : a))
    .label;
}
