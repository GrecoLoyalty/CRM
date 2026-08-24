"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BotonGoogle({ conectado }: { conectado: boolean }) {
  const [cargando, setCargando] = useState(false);
  const router = useRouter();

  async function desconectar() {
    if (!confirm("¿Desconectar tu cuenta de Google? Dejarás de poder enviar correos desde Gmail y de sincronizar eventos con tu Google Calendar hasta que la vuelvas a conectar.")) {
      return;
    }
    setCargando(true);
    try {
      await fetch("/api/google/disconnect", { method: "POST" });
      router.refresh();
    } finally {
      setCargando(false);
    }
  }

  if (conectado) {
    return (
      <button onClick={desconectar} disabled={cargando} className="btn-secondary text-sm">
        {cargando ? "Desconectando…" : "Desconectar"}
      </button>
    );
  }

  return (
    <a href="/api/google/connect" className="btn-primary text-sm">
      Conectar con Google
    </a>
  );
}
