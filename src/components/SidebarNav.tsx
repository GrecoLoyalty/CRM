"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Icon from "@/components/ui/Icon";
import { NAV_POR_ROL, resolverActivo } from "@/lib/navegacion";
import type { Perfil } from "@/lib/types";
import clsx from "clsx";

export default function SidebarNav({
  perfil,
  onNavigate,
}: {
  perfil: Perfil;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const grupos = NAV_POR_ROL[perfil.role] || [];
  const activo = resolverActivo(pathname, grupos);

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const iniciales = (perfil.nombre_completo || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <aside className="w-64 md:w-60 h-full shrink-0 bg-base-850 border-r border-base-600 flex flex-col">
      {/* ---------- Marca ---------- */}
      <div className="relative p-4 border-b border-base-600 flex items-center justify-between filo-neon">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-2.5 min-w-0 group"
        >
          <div
            className="w-8 h-8 rounded-lg bg-accent shadow-glow-accent flex items-center justify-center
                       font-display font-bold text-base-950 text-sm shrink-0"
          >
            G
          </div>
          <div className="min-w-0">
            <p className="font-display font-semibold tracking-tight text-gray-50 text-sm leading-tight">
              GRESANOVA
            </p>
            <p className="text-[10px] uppercase tracking-[0.14em] text-gray-600 leading-tight">
              Operating System
            </p>
          </div>
        </Link>
        <button
          onClick={onNavigate}
          className="md:hidden btn-ghost p-1.5"
          aria-label="Cerrar menú"
        >
          <Icon name="cerrar" className="w-5 h-5" />
        </button>
      </div>

      {/* ---------- Navegación ---------- */}
      <nav className="flex-1 px-2.5 py-3 overflow-y-auto">
        {grupos.map((grupo, gi) => (
          <div key={grupo.titulo ?? `grupo-${gi}`} className={gi > 0 ? "mt-5" : ""}>
            {grupo.titulo && (
              <p className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-600">
                {grupo.titulo}
              </p>
            )}
            <div className="space-y-0.5">
              {grupo.items.map((item) => {
                const esActivo = activo === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={esActivo ? "page" : undefined}
                    className={clsx(
                      "relative flex items-center gap-2.5 pl-3 pr-2.5 py-2 rounded-lg text-sm",
                      "transition-colors duration-200",
                      esActivo
                        ? "bg-accent/12 text-accent-soft font-medium"
                        : "text-gray-400 hover:bg-base-750 hover:text-gray-100"
                    )}
                  >
                    {/* Filo neón del elemento activo */}
                    {esActivo && (
                      <span
                        aria-hidden="true"
                        className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full
                                   bg-accent-neon shadow-glow-cyan"
                      />
                    )}
                    <Icon
                      name={item.icon}
                      className={clsx(
                        "w-[18px] h-[18px] shrink-0 transition-colors duration-200",
                        esActivo ? "text-accent-neon" : "text-gray-600"
                      )}
                    />
                    <span className="truncar flex-1">{item.label}</span>
                    {item.paso && (
                      <span
                        className={clsx(
                          "font-mono text-[10px] tabular-nums shrink-0",
                          esActivo ? "text-accent-soft/80" : "text-gray-700"
                        )}
                      >
                        {item.paso}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ---------- Usuario ---------- */}
      <div className="p-2.5 border-t border-base-600">
        <div className="flex items-center gap-2.5 px-1.5 py-2">
          <div
            className="w-9 h-9 rounded-full bg-base-700 border border-base-500
                       flex items-center justify-center text-[11px] font-semibold
                       text-gray-200 shrink-0"
          >
            {iniciales || "··"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-gray-100 truncar">{perfil.nombre_completo}</p>
            <p className="text-[11px] text-gray-500 capitalize truncar">
              {perfil.role}
              {perfil.subrol ? ` · ${perfil.subrol}` : ""}
            </p>
          </div>
        </div>
        <button onClick={logout} className="btn-secondary w-full mt-1.5 text-sm">
          <Icon name="salir" className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
