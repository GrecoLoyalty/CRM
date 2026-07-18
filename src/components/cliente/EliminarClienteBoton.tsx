"use client";

import { useState } from "react";
import { eliminarCliente } from "@/app/dashboard/cliente/actions";

export default function EliminarClienteBoton({ clienteId, nombreEmpresa }: { clienteId: string; nombreEmpresa: string }) {
  const [eliminando, setEliminando] = useState(false);

  async function manejarClick() {
    const primeraConfirmacion = window.confirm(
      `¿Eliminar por completo a "${nombreEmpresa}"? Esto borra también sus tareas, chats, bóveda y bitácora. No se puede deshacer.`
    );
    if (!primeraConfirmacion) return;

    const segundaConfirmacion = window.prompt(
      `Para confirmar, escribe el nombre exacto del cliente: "${nombreEmpresa}"`
    );
    if (segundaConfirmacion !== nombreEmpresa) {
      if (segundaConfirmacion !== null) alert("El nombre no coincide. No se eliminó nada.");
      return;
    }

    setEliminando(true);
    try {
      await eliminarCliente(clienteId);
    } catch (e: any) {
      alert(e.message || "No se pudo eliminar.");
      setEliminando(false);
    }
  }

  return (
    <button
      onClick={manejarClick}
      disabled={eliminando}
      className="text-xs text-signal-urgent hover:underline whitespace-nowrap"
    >
      {eliminando ? "Eliminando..." : "🗑 Eliminar cliente"}
    </button>
  );
}
