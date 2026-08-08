import type { IconName } from "@/components/ui/Icon";

export type Item = { href: string; label: string; icon: IconName; paso?: number };
export type Grupo = { titulo?: string; items: Item[] };

const DIA_A_DIA: Item[] = [
  { href: "/dashboard/calendario", label: "Calendario", icon: "calendario" },
  { href: "/dashboard/tickets", label: "Tickets", icon: "tickets" },
  { href: "/dashboard/mis-tareas", label: "Mis tareas", icon: "tareas" },
];

const FLUJO: Item[] = [
  { href: "/dashboard/ventas", label: "Ventas", icon: "ventas", paso: 1 },
  { href: "/dashboard/analisis", label: "Análisis", icon: "analisis", paso: 2 },
  { href: "/dashboard/estetica", label: "Estética Visual", icon: "estetica", paso: 3 },
  { href: "/dashboard/desarrollo", label: "Desarrollo", icon: "desarrollo", paso: 4 },
];

const DIRECCION: Item[] = [
  { href: "/dashboard/ceo", label: "Vista de Águila", icon: "aguila" },
  { href: "/dashboard/ceo/tareas", label: "Asignar tarea", icon: "asignar" },
  { href: "/dashboard/ceo/boveda", label: "Bóveda", icon: "boveda" },
];

export const NAV_POR_ROL: Record<string, Grupo[]> = {
  root: [
    {
      items: [
        { href: "/dashboard/root", label: "Panel Root", icon: "escudo" },
        { href: "/dashboard/root/clientes", label: "Clientes", icon: "clientes" },
      ],
    },
    { titulo: "Día a día", items: DIA_A_DIA },
    { titulo: "Dirección", items: DIRECCION },
    { titulo: "Flujo de producción", items: FLUJO },
  ],
  ceo: [
    { titulo: "Dirección", items: DIRECCION },
    { titulo: "Día a día", items: DIA_A_DIA },
    { titulo: "Flujo de producción", items: FLUJO },
  ],
  analista: [
    {
      items: [
        { href: "/dashboard/analisis", label: "Análisis", icon: "analisis" },
        { href: "/dashboard/vista-aguila", label: "Vista de Águila", icon: "aguila" },
      ],
    },
    { titulo: "Día a día", items: DIA_A_DIA },
  ],
  vendedor: [
    {
      items: [
        { href: "/dashboard/ventas", label: "Ventas", icon: "ventas" },
        { href: "/dashboard/vista-aguila", label: "Vista de Águila", icon: "aguila" },
      ],
    },
    { titulo: "Día a día", items: DIA_A_DIA },
  ],
  produccion: [
    {
      items: [
        { href: "/dashboard/estetica", label: "Estética Visual", icon: "estetica" },
        { href: "/dashboard/desarrollo", label: "Desarrollo", icon: "desarrollo" },
        { href: "/dashboard/vista-aguila", label: "Vista de Águila", icon: "aguila" },
      ],
    },
    { titulo: "Día a día", items: DIA_A_DIA },
  ],
};

/* Rutas que no están en el menú pero sí necesitan título en la cabecera */
const TITULOS_EXTRA: { href: string; label: string }[] = [
  { href: "/dashboard/cliente", label: "Ficha de cliente" },
  { href: "/dashboard/vista-aguila", label: "Vista de Águila" },
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
  const hrefs = grupos.flatMap((g) => g.items.map((i) => i.href));
  const coincidencias = hrefs.filter(
    (h) => pathname === h || pathname.startsWith(h + "/")
  );
  if (coincidencias.length === 0) return null;
  return coincidencias.reduce((a, b) => (b.length > a.length ? b : a));
}

/** Nombre legible de la sección actual, para la cabecera. */
export function tituloDeRuta(pathname: string | null, role: string): string {
  if (!pathname) return "Inicio";

  const items = (NAV_POR_ROL[role] || []).flatMap((g) => g.items);
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
