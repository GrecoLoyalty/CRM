"use client";

import { useEffect, useRef } from "react";
import { registrarActividadSesion } from "@/app/dashboard/actividad-actions";

const UMBRAL_INACTIVIDAD_MS = 300_000; // 5 minutos, igual que useInactivityPing

// Mide cuánto tiempo pasa cada persona realmente usando el CRM (no solo con
// la pestaña abierta), para la gráfica de barras "Tiempo en el CRM" que ven
// todos. Se monta una sola vez en el layout del dashboard (DashboardShell),
// no por tarea, así corre en toda página del sistema.
export function useSesionPing() {
  const ultimaActividad = useRef(Date.now());

  useEffect(() => {
    const marcarActividad = () => {
      ultimaActividad.current = Date.now();
    };
    window.addEventListener("mousemove", marcarActividad);
    window.addEventListener("keypress", marcarActividad);
    window.addEventListener("scroll", marcarActividad);

    // Un primer ping al entrar, y luego cada 60s mientras haya actividad real.
    registrarActividadSesion().catch(() => {});
    const intervalo = setInterval(() => {
      const inactivo = Date.now() - ultimaActividad.current > UMBRAL_INACTIVIDAD_MS;
      if (!inactivo) {
        registrarActividadSesion().catch(() => {});
      }
    }, 60_000);

    return () => {
      window.removeEventListener("mousemove", marcarActividad);
      window.removeEventListener("keypress", marcarActividad);
      window.removeEventListener("scroll", marcarActividad);
      clearInterval(intervalo);
    };
  }, []);
}
