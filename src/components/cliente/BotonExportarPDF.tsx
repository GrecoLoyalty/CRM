"use client";

import { useState } from "react";

export default function BotonExportarPDF({ clienteId }: { clienteId: string }) {
  const [generando, setGenerando] = useState(false);

  async function exportar() {
    setGenerando(true);
    try {
      const res = await fetch(`/api/clientes/${clienteId}/pdf`);
      if (!res.ok) throw new Error("No se pudo generar el PDF.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const nombre = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1];
      a.download = nombre || "ficha-cliente.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("No se pudo generar el PDF. Intenta de nuevo.");
    } finally {
      setGenerando(false);
    }
  }

  return (
    <button onClick={exportar} disabled={generando} className="btn-secondary text-sm">
      {generando ? "Generando…" : "📄 Exportar PDF"}
    </button>
  );
}
