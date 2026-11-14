"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { eliminarProspecto } from "@/app/dashboard/ventas/actions";

export default function EliminarProspectoBoton({
  prospectoId,
  nombreEmpresa,
}: {
  prospectoId: string;
  nombreEmpresa: string;
}) {
  const [eliminando, setEliminando] = useState(false);
  const router = useRouter();

  async function manejarClick() {
    const confirmado = window.confirm(
      `¿Eliminar el prospecto "${nombreEmpresa}"? Esta acción no se puede deshacer.`
    );
    if (!confirmado) return;

    const confirmacion = window.prompt(`Para confirmar, escribe el nombre exacto: "${nombreEmpresa}"`);
    if (confirmacion !== nombreEmpresa) {
      if (confirmacion !== null) window.alert("El nombre no coincide. No se eliminó nada.");
      return;
    }

    setEliminando(true);
    try {
      await eliminarProspecto(prospectoId);
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "No se pudo eliminar el prospecto.");
      setEliminando(false);
    }
  }

  return (
    <button
      type="button"
      onClick={manejarClick}
      disabled={eliminando}
      className="text-xs text-signal-urgent hover:underline whitespace-nowrap disabled:opacity-50"
    >
      {eliminando ? "Eliminando..." : "🗑 Eliminar prospecto"}
    </button>
  );
}
