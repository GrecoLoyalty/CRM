import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import BitacoraCliente from "@/components/cliente/BitacoraCliente";
import BotonVolver from "@/components/cliente/BotonVolver";
import EliminarClienteBoton from "@/components/cliente/EliminarClienteBoton";
import Link from "next/link";
import { ESTADO_COLOR } from "@/lib/types";

export default async function PerfilClientePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: miPerfil } = await supabase.from("perfiles").select("role").eq("id", user!.id).single();

  const { data: cliente } = await supabase.from("clientes").select("*").eq("id", params.id).single();
  if (!cliente) notFound(); // RLS ya filtra si no tiene acceso; aquí solo confirmamos que existe para él

  const { data: giro } = cliente.giro_id
    ? await supabase.from("giros_industria").select("nombre").eq("id", cliente.giro_id).single()
    : { data: null };

  const { data: bitacora } = await supabase
    .from("cliente_bitacora")
    .select("*")
    .eq("cliente_id", cliente.id)
    .order("created_at", { ascending: true });

  const { data: tareas } = await supabase
    .from("tareas")
    .select("id, depto, titulo, estado, link_entregable, updated_at")
    .eq("cliente_id", cliente.id)
    .order("created_at", { ascending: true });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <BotonVolver />
          {miPerfil?.role === "root" && <EliminarClienteBoton clienteId={cliente.id} nombreEmpresa={cliente.nombre_empresa} />}
        </div>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="text-2xl font-display font-semibold">{cliente.nombre_empresa}</h1>
          <span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_COLOR[cliente.estado as keyof typeof ESTADO_COLOR]}`}>
            {cliente.estado}
          </span>
        </div>
        <p className="text-gray-500 text-sm mt-1">
          {cliente.nombre_contacto} · {cliente.telefono} {cliente.email && `· ${cliente.email}`} {giro?.nombre && `· ${giro.nombre}`}
        </p>
        <p className="text-xs text-gray-600 mt-1 font-mono">{cliente.cliente_codigo}</p>
      </div>

      {/* Lo que dijo Ventas */}
      <section className="card p-5">
        <h2 className="font-display font-semibold text-sm text-gray-400 uppercase tracking-wide mb-2">① Necesidad detectada (Ventas)</h2>
        <p className="text-sm">{cliente.necesidad_detectada}</p>
        {cliente.presupuesto_estimado && (
          <p className="text-xs text-gray-500 mt-2">Presupuesto estimado: <span className="capitalize">{cliente.presupuesto_estimado}</span></p>
        )}
      </section>

      {/* El Briefing de Análisis */}
      <section className="card p-5">
        <h2 className="font-display font-semibold text-sm text-gray-400 uppercase tracking-wide mb-2">② Briefing (Análisis)</h2>
        {cliente.briefing_texto ? (
          <>
            <p className="text-sm whitespace-pre-wrap">{cliente.briefing_texto}</p>
            {cliente.briefing_archivo_url && (
              <a href={cliente.briefing_archivo_url} target="_blank" className="text-xs text-accent-soft underline mt-2 inline-block">
                Ver archivo adjunto
              </a>
            )}
            <div className="flex gap-2 mt-3">
              {cliente.ruta_visual && <span className="text-xs bg-accent/15 text-accent-soft px-2 py-0.5 rounded-full">Ruta Visual</span>}
              {cliente.ruta_software && <span className="text-xs bg-accent/15 text-accent-soft px-2 py-0.5 rounded-full">Ruta Software</span>}
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-500">Aún no hay briefing — el cliente sigue en Análisis.</p>
        )}
      </section>

      {/* Tareas y entregables por depto */}
      {tareas && tareas.length > 0 && (
        <section className="card p-5">
          <h2 className="font-display font-semibold text-sm text-gray-400 uppercase tracking-wide mb-3">③ Tareas y entregables</h2>
          <div className="space-y-2">
            {tareas.map((t) => (
              <div key={t.id} className="flex items-center justify-between text-sm border-b border-base-700 pb-2 last:border-0">
                <div>
                  <span className="text-xs text-gray-500 uppercase mr-2">{t.depto}</span>
                  {t.titulo}
                  <span className="text-xs text-gray-600 ml-2">({t.estado})</span>
                </div>
                {t.link_entregable && (
                  <a href={t.link_entregable} target="_blank" className="text-xs text-accent-soft underline shrink-0">
                    Ver entregable
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Bitácora compartida — aquí es donde cualquier depto deja su nota/link */}
      <BitacoraCliente clienteId={cliente.id} userId={user!.id} entradasIniciales={bitacora || []} />
    </div>
  );
}
