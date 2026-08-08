"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import SidebarNav from "@/components/SidebarNav";
import BannerUrgencia from "@/components/BannerUrgencia";
import NotificacionesBell from "@/components/shared/NotificacionesBell";
import ChatWidget from "@/components/shared/ChatWidget";
import ChatEquipoWidget from "@/components/shared/ChatEquipoWidget";
import Icon from "@/components/ui/Icon";
import { useSesionPing } from "@/hooks/useSesionPing";
import { tituloDeRuta } from "@/lib/navegacion";
import type { Perfil } from "@/lib/types";
import clsx from "clsx";

export default function DashboardShell({
  perfil,
  userId,
  banners,
  children,
}: {
  perfil: Perfil;
  userId: string;
  banners: any[];
  children: React.ReactNode;
}) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const pathname = usePathname();
  const esCeo = perfil.role === "root" || perfil.role === "ceo";
  const titulo = tituloDeRuta(pathname, perfil.role);
  useSesionPing();

  return (
    <div className="min-h-screen bg-base-900 flex">
      {/* Velo al abrir el menú en móvil */}
      {menuAbierto && (
        <div
          aria-hidden="true"
          className="fixed inset-0 bg-base-950/70 backdrop-blur-sm z-40 md:hidden animate-fade-in"
          onClick={() => setMenuAbierto(false)}
        />
      )}

      {/* Sidebar: cajón deslizable en móvil, fijo en escritorio */}
      <div
        className={clsx(
          "fixed md:static inset-y-0 left-0 z-50 md:translate-x-0",
          "transition-transform duration-200 ease-out",
          menuAbierto ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarNav perfil={perfil} onNavigate={() => setMenuAbierto(false)} />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {/* ---------- Cabecera ---------- */}
        <header
          className="sticky top-0 z-30 flex items-center gap-3 px-3 md:px-6 h-14
                     border-b border-base-600 bg-base-900/85 backdrop-blur-md"
        >
          <button
            onClick={() => setMenuAbierto(true)}
            className="md:hidden btn-icon shrink-0"
            aria-label="Abrir menú"
            aria-expanded={menuAbierto}
          >
            <Icon name="menu" className="w-5 h-5" />
          </button>

          <h1 className="font-display font-semibold text-gray-50 tracking-tight truncar text-base md:text-lg">
            {titulo}
          </h1>

          <div className="flex-1" />

          {esCeo && (
            <span className="badge badge-accent hidden sm:inline-flex">
              {perfil.role === "root" ? "Root" : "Dirección"}
            </span>
          )}

          <NotificacionesBell userId={userId} />
        </header>

        {/* ---------- Contenido ---------- */}
        <main className="flex-1 overflow-y-auto">
          {banners.length > 0 && <BannerUrgencia banners={banners} />}
          <div className="max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8">{children}</div>
        </main>
      </div>

      <ChatWidget userId={userId} esCeo={esCeo} />
      <ChatEquipoWidget userId={userId} />
    </div>
  );
}
