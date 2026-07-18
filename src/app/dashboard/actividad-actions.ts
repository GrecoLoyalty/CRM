"use server";

import { createClient } from "@/lib/supabase/server";

// Ping de actividad general del CRM — llamado cada 60s desde el navegador
// mientras haya interacción real (mousemove/keypress/scroll), igual que
// el sistema de detección de inactividad de tareas (useInactivityPing).
// Acumula segundos activos por persona y por día en tiempo_uso_diario,
// que alimenta la gráfica de barras "tiempo en el CRM" visible para todos.
export async function registrarActividadSesion() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const hoy = new Date().toISOString().slice(0, 10);

  const { data: fila } = await supabase
    .from("tiempo_uso_diario")
    .select("segundos_activos, ultimo_ping")
    .eq("perfil_id", user.id)
    .eq("fecha", hoy)
    .maybeSingle();

  const ahora = new Date();
  const ultimoPing = fila?.ultimo_ping ? new Date(fila.ultimo_ping) : ahora;
  // Tope de 60s por ping para que nadie pueda inflar su tiempo manipulando el cliente.
  const deltaSeg = Math.min(60, Math.max(0, Math.floor((ahora.getTime() - ultimoPing.getTime()) / 1000)));

  const { error } = await supabase.from("tiempo_uso_diario").upsert(
    {
      perfil_id: user.id,
      fecha: hoy,
      segundos_activos: (fila?.segundos_activos || 0) + deltaSeg,
      ultimo_ping: ahora.toISOString(),
    },
    { onConflict: "perfil_id,fecha" }
  );
  if (error) throw new Error(error.message);
}
