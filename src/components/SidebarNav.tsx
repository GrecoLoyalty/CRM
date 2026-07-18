"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Perfil } from "@/lib/types";
import clsx from "clsx";

const NAV_POR_ROL: Record<string, { href: string; label: string; icon: string }[]> = {
  root: [
    { href: "/dashboard/root", label: "Panel Root", icon: "◆" },
    { href: "/dashboard/root/clientes", label: "Clientes", icon: "☰" },
    { href: "/dashboard/ceo", label: "Vista de Águila", icon: "◈" },
    { href: "/dashboard/ceo/boveda", label: "Bóveda", icon: "🔒" },
    { href: "/dashboard/ventas", label: "Ventas", icon: "①" },
    { href: "/dashboard/analisis", label: "Análisis", icon: "②" },
    { href: "/dashboard/estetica", label: "Estética Visual", icon: "③" },
    { href: "/dashboard/desarrollo", label: "Desarrollo", icon: "④" },
  ],
  ceo: [
    { href: "/dashboard/ceo", label: "Vista de Águila", icon: "◈" },
    { href: "/dashboard/ceo/boveda", label: "Bóveda", icon: "🔒" },
    { href: "/dashboard/ventas", label: "Ventas", icon: "①" },
    { href: "/dashboard/analisis", label: "Análisis", icon: "②" },
    { href: "/dashboard/estetica", label: "Estética Visual", icon: "③" },
    { href: "/dashboard/desarrollo", label: "Desarrollo", icon: "④" },
  ],
  analista: [
    { href: "/dashboard/analisis", label: "Análisis", icon: "②" },
    { href: "/dashboard/vista-aguila", label: "Vista de Águila", icon: "◈" },
  ],
  vendedor: [
    { href: "/dashboard/ventas", label: "Ventas", icon: "①" },
    { href: "/dashboard/vista-aguila", label: "Vista de Águila", icon: "◈" },
  ],
  produccion: [
    { href: "/dashboard/estetica", label: "Estética Visual", icon: "③" },
    { href: "/dashboard/desarrollo", label: "Desarrollo", icon: "④" },
    { href: "/dashboard/vista-aguila", label: "Vista de Águila", icon: "◈" },
  ],
};

export default function SidebarNav({ perfil, onNavigate }: { perfil: Perfil; onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const items = NAV_POR_ROL[perfil.role] || [];

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-64 md:w-60 h-full shrink-0 bg-base-800 border-r border-base-600 flex flex-col">
      <div className="p-5 border-b border-base-600 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center font-display font-bold text-base-900 text-sm">G</div>
          <span className="font-display font-semibold tracking-tight">GRESANOVA OS</span>
        </div>
        <button onClick={onNavigate} className="md:hidden text-gray-500 text-lg leading-none" aria-label="Cerrar menú">
          ✕
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={clsx(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
              pathname.startsWith(item.href)
                ? "bg-accent/15 text-accent-soft font-medium"
                : "text-gray-400 hover:bg-base-700 hover:text-gray-200"
            )}
          >
            <span className="font-mono text-xs opacity-70">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t border-base-600">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-base-600 flex items-center justify-center text-xs font-semibold uppercase shrink-0">
            {perfil.nombre_completo?.slice(0, 2)}
          </div>
          <div className="min-w-0">
            <p className="text-sm truncate">{perfil.nombre_completo}</p>
            <p className="text-xs text-gray-500 capitalize">{perfil.role}{perfil.subrol ? ` · ${perfil.subrol}` : ""}</p>
          </div>
        </div>
        <button onClick={logout} className="btn-secondary w-full mt-2 text-sm">
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
