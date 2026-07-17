"use client";

import { useEffect, useRef } from "react";
import { pingActividad } from "@/app/dashboard/tareas-actions";

const UMBRAL_INACTIVIDAD_MS = 300_000; // 5 minutos, según el blueprint

// Detecta actividad real del usuario (mousemove/keypress/scroll) en la pestaña.
// Si el usuario está inactivo por más de 5 min, el ping deja de contar tiempo activo
// en el backend (el backend calcula el delta real entre pings, no confía en el cliente).
export function useInactivityPing(tareaId: string) {
  const ultimaActividad = useRef(Date.now());

  useEffect(() => {
    const marcarActividad = () => {
      ultimaActividad.current = Date.now();
    };
    window.addEventListener("mousemove", marcarActividad);
    window.addEventListener("keypress", marcarActividad);
    window.addEventListener("scroll", marcarActividad);

    const intervalo = setInterval(() => {
      const inactivo = Date.now() - ultimaActividad.current > UMBRAL_INACTIVIDAD_MS;
      if (!inactivo) {
        pingActividad(tareaId).catch(() => {});
      }
    }, 60_000);

    return () => {
      window.removeEventListener("mousemove", marcarActividad);
      window.removeEventListener("keypress", marcarActividad);
      window.removeEventListener("scroll", marcarActividad);
      clearInterval(intervalo);
    };
  }, [tareaId]);
}
