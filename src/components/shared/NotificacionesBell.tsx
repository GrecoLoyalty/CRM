"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import Icon from "@/components/ui/Icon";
import clsx from "clsx";

export default function NotificacionesBell({ userId }: { userId: string }) {
  const [abierto, setAbierto] = useState(false);
  const [notifs, setNotifs] = useState<any[]>([]);
  /* Al abrir se marcan todas como leídas en la base, así que guardamos
     cuáles estaban sin leer para poder seguir resaltándolas en pantalla. */
  const [recienLeidas, setRecienLeidas] = useState<Set<string>>(new Set());
  const contenedor = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  async function cargar() {
    const { data } = await supabase
      .from("notificaciones")
      .select("*")
      .eq("destinatario_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    setNotifs(data || []);
  }

  useEffect(() => {
    cargar();
    const canal = supabase
      .channel(`notif-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notificaciones",
          filter: `destinatario_id=eq.${userId}`,
        },
        () => {
          cargar();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  /* Cerrar al hacer clic fuera o con Escape */
  useEffect(() => {
    if (!abierto) return;
    function alClic(e: MouseEvent) {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false);
    }
    function alTeclear(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierto(false);
    }
    document.addEventListener("mousedown", alClic);
    document.addEventListener("keydown", alTeclear);
    return () => {
      document.removeEventListener("mousedown", alClic);
      document.removeEventListener("keydown", alTeclear);
    };
  }, [abierto]);

  const noLeidas = notifs.filter((n) => !n.leida).length;

  async function marcarLeidas() {
    setAbierto(!abierto);
    if (!abierto && noLeidas > 0) {
      setRecienLeidas(new Set(notifs.filter((n) => !n.leida).map((n) => n.id)));
      await supabase
        .from("notificaciones")
        .update({ leida: true })
        .eq("destinatario_id", userId)
        .eq("leida", false);
      cargar();
    }
  }

  return (
    <div className="relative" ref={contenedor}>
      <button
        onClick={marcarLeidas}
        className={clsx("btn-icon relative", abierto && "bg-base-600 border-base-500")}
        aria-label={
          noLeidas > 0 ? `Notificaciones, ${noLeidas} sin leer` : "Notificaciones"
        }
        aria-expanded={abierto}
      >
        <Icon name="campana" className="w-[18px] h-[18px]" />
        {noLeidas > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1
                       bg-signal-urgent text-white text-[10px] font-semibold
                       rounded-full flex items-center justify-center
                       shadow-glow-urgent tabular-nums"
          >
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        )}
      </button>

      {abierto && (
        <div
          className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-1.5rem)]
                     surface-float p-1.5 max-h-96 overflow-y-auto z-50 animate-slide-down"
        >
          <p className="px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-600">
            Notificaciones
          </p>

          {notifs.length === 0 && (
            <div className="px-2.5 py-6 text-center">
              <Icon name="campana" className="w-6 h-6 mx-auto text-gray-700 mb-2" />
              <p className="text-sm text-gray-500">Sin notificaciones.</p>
            </div>
          )}

          {notifs.map((n) => {
            const destacada = recienLeidas.has(n.id) || !n.leida;
            return (
              <div
                key={n.id}
                className={clsx(
                  "relative px-2.5 py-2 rounded-lg transition-colors duration-150",
                  "hover:bg-base-700",
                  destacada && "bg-accent/[0.07]"
                )}
              >
                <div className="flex items-start gap-2">
                  <span
                    aria-hidden="true"
                    className={clsx(
                      "w-1.5 h-1.5 rounded-full shrink-0 mt-1.5",
                      destacada ? "bg-accent-neon shadow-glow-cyan" : "bg-transparent"
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-100 leading-snug">{n.titulo}</p>
                    {n.mensaje && (
                      <p className="text-xs text-gray-400 mt-0.5 leading-snug">
                        {n.mensaje}
                      </p>
                    )}
                    <p className="text-[10px] text-gray-600 mt-1 font-mono">
                      {formatDistanceToNow(new Date(n.created_at), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
