"use client";

import { useState } from "react";
import SidebarNav from "@/components/SidebarNav";
import BannerUrgencia from "@/components/BannerUrgencia";
import NotificacionesBell from "@/components/shared/NotificacionesBell";
import ChatWidget from "@/components/shared/ChatWidget";
import ChatEquipoWidget from "@/components/shared/ChatEquipoWidget";
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
  const esCeo = perfil.role === "root" || perfil.role === "ceo";

  return (
    <div className="min-h-screen bg-base-900 flex">
      {/* Fondo oscuro al abrir el menú en móvil */}
      {menuAbierto && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setMenuAbierto(false)} />
      )}

      {/* Sidebar: drawer deslizable en móvil, fijo en escritorio */}
      <div
        className={clsx(
          "fixed md:static inset-y-0 left-0 z-50 transition-transform duration-200 md:translate-x-0",
          menuAbierto ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarNav perfil={perfil} onNavigate={() => setMenuAbierto(false)} />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {banners.length > 0 && <BannerUrgencia banners={banners} />}
        <header className="flex items-center justify-between p-3 md:p-4 border-b border-base-600">
          <button
            onClick={() => setMenuAbierto(true)}
            className="md:hidden w-9 h-9 rounded-lg bg-base-700 border border-base-600 flex items-center justify-center text-lg"
            aria-label="Abrir menú"
          >
            ☰
          </button>
          <div className="flex-1" />
          <NotificacionesBell userId={userId} />
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
      </div>

      <ChatWidget userId={userId} esCeo={esCeo} />
      <ChatEquipoWidget userId={userId} />
    </div>
  );
}
