"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export default function AvisoGoogle() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const estado = params.get("google");
  const motivo = params.get("motivo");

  // Limpia el query param de la URL después de mostrarlo, para que un
  // refresh no vuelva a disparar el aviso.
  useEffect(() => {
    if (!estado) return;
    const t = setTimeout(() => router.replace(pathname), 4000);
    return () => clearTimeout(t);
  }, [estado, pathname, router]);

  if (!estado) return null;

  if (estado === "conectado") {
    return (
      <div className="rounded-lg border border-signal-info/35 bg-signal-info/10 text-signal-info text-sm px-4 py-3">
        Tu cuenta de Google quedó conectada correctamente.
      </div>
    );
  }
  if (estado === "cancelado") {
    return (
      <div className="rounded-lg border border-base-600 bg-base-750 text-gray-400 text-sm px-4 py-3">
        Cancelaste la conexión con Google — no se guardó ningún cambio.
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-signal-urgent/35 bg-signal-urgent/10 text-signal-urgent text-sm px-4 py-3">
      No se pudo conectar tu cuenta de Google.{motivo ? ` (${motivo})` : ""} Intenta de nuevo o avisa a Root.
    </div>
  );
}
