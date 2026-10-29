"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ResultadoScrum } from "@/app/dashboard/scrum/actions";

/** Ejecuta una server action, muestra el error de las reglas y refresca la pantalla. */
export function useAccion() {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function ejecutar(accion: () => Promise<ResultadoScrum>, alTerminar?: () => void) {
    setError(null);
    startTransition(async () => {
      const r = await accion();
      if (r.error) {
        setError(r.error);
        return;
      }
      alTerminar?.();
      router.refresh();
    });
  }

  return { pendiente, error, ejecutar, limpiarError: () => setError(null) };
}
