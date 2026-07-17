"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export default function NotificacionesBell({ userId }: { userId: string }) {
  const [abierto, setAbierto] = useState(false);
  const [notifs, setNotifs] = useState<any[]>([]);
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
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notificaciones", filter: `destinatario_id=eq.${userId}` }, () => {
        cargar();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const noLeidas = notifs.filter((n) => !n.leida).length;

  async function marcarLeidas() {
    setAbierto(!abierto);
    if (!abierto && noLeidas > 0) {
      await supabase.from("notificaciones").update({ leida: true }).eq("destinatario_id", userId).eq("leida", false);
      cargar();
    }
  }

  return (
    <div className="relative">
      <button onClick={marcarLeidas} className="relative w-9 h-9 rounded-lg bg-base-700 hover:bg-base-600 flex items-center justify-center border border-base-600">
        <span className="text-sm">🔔</span>
        {noLeidas > 0 && (
          <span className="absolute -top-1 -right-1 bg-signal-urgent text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
            {noLeidas}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 mt-2 w-80 card p-2 max-h-96 overflow-y-auto z-50 shadow-xl">
          {notifs.length === 0 && <p className="text-sm text-gray-500 p-3">Sin notificaciones.</p>}
          {notifs.map((n) => (
            <div key={n.id} className="p-2 hover:bg-base-700 rounded-lg">
              <p className="text-sm">{n.titulo}</p>
              {n.mensaje && <p className="text-xs text-gray-500">{n.mensaje}</p>}
              <p className="text-[10px] text-gray-600 mt-0.5">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
