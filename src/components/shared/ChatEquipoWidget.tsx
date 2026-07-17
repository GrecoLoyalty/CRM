"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Conversacion {
  id: string;
  tipo: "directo" | "grupo";
  nombre: string | null;
  participantes: { usuario_id: string; nombre_completo: string }[];
}

export default function ChatEquipoWidget({ userId }: { userId: string }) {
  const [abierto, setAbierto] = useState(false);
  const [vista, setVista] = useState<"lista" | "nueva" | "conversacion">("lista");
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [perfiles, setPerfiles] = useState<any[]>([]);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [nombreGrupo, setNombreGrupo] = useState("");
  const [conversacionActiva, setConversacionActiva] = useState<Conversacion | null>(null);
  const [mensajes, setMensajes] = useState<any[]>([]);
  const [texto, setTexto] = useState("");
  const [noLeidas, setNoLeidas] = useState<Record<string, boolean>>({});
  const supabase = createClient();

  async function cargarConversaciones() {
    const { data: participaciones } = await supabase
      .from("conversacion_participantes")
      .select("conversacion_id, last_read_at")
      .eq("usuario_id", userId);

    const ids = (participaciones || []).map((p) => p.conversacion_id);
    if (ids.length === 0) {
      setConversaciones([]);
      return;
    }

    const { data: convs } = await supabase
      .from("conversaciones")
      .select("id, tipo, nombre, conversacion_participantes(usuario_id, perfiles(nombre_completo))")
      .in("id", ids)
      .order("created_at", { ascending: false });

    const formateadas: Conversacion[] = (convs || []).map((c: any) => ({
      id: c.id,
      tipo: c.tipo,
      nombre: c.nombre,
      participantes: (c.conversacion_participantes || []).map((p: any) => ({
        usuario_id: p.usuario_id,
        nombre_completo: p.perfiles?.nombre_completo || "?",
      })),
    }));
    setConversaciones(formateadas);
  }

  useEffect(() => {
    if (abierto && vista === "lista") cargarConversaciones();
    if (abierto && vista === "nueva") {
      (async () => {
        const { data } = await supabase.from("perfiles").select("id, nombre_completo").neq("id", userId).eq("activo", true).order("nombre_completo");
        setPerfiles(data || []);
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, vista]);

  async function abrirConversacion(conv: Conversacion) {
    setConversacionActiva(conv);
    setVista("conversacion");
    const { data } = await supabase.from("mensajes_generales").select("*").eq("conversacion_id", conv.id).order("created_at");
    setMensajes(data || []);
    await supabase
      .from("conversacion_participantes")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversacion_id", conv.id)
      .eq("usuario_id", userId);
  }

  useEffect(() => {
    if (!conversacionActiva) return;
    const canal = supabase
      .channel(`chatequipo-${conversacionActiva.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "mensajes_generales", filter: `conversacion_id=eq.${conversacionActiva.id}` },
        (payload) => setMensajes((m) => [...m, payload.new])
      )
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversacionActiva?.id]);

  async function crearConversacion() {
    if (seleccionados.length === 0) return;
    const tipo = seleccionados.length === 1 ? "directo" : "grupo";

    const { data: conv, error } = await supabase
      .from("conversaciones")
      .insert({ tipo, nombre: tipo === "grupo" ? nombreGrupo || "Grupo sin nombre" : null, created_by: userId })
      .select()
      .single();
    if (error || !conv) return;

    // Insertar primero al creador (así la política RLS permite luego agregar a los demás)
    await supabase.from("conversacion_participantes").insert({ conversacion_id: conv.id, usuario_id: userId });
    await supabase.from("conversacion_participantes").insert(
      seleccionados.map((id) => ({ conversacion_id: conv.id, usuario_id: id }))
    );

    setSeleccionados([]);
    setNombreGrupo("");
    setVista("lista");
    cargarConversaciones();
  }

  async function enviar() {
    if (!texto.trim() || !conversacionActiva) return;
    await supabase.from("mensajes_generales").insert({ conversacion_id: conversacionActiva.id, autor_id: userId, contenido: texto });
    setTexto("");
  }

  function nombreConversacion(c: Conversacion) {
    if (c.tipo === "grupo") return c.nombre || "Grupo";
    const otro = c.participantes.find((p) => p.usuario_id !== userId);
    return otro?.nombre_completo || "Conversación";
  }

  return (
    <div className="fixed bottom-4 right-20 md:bottom-5 md:right-24 z-40">
      {abierto && (
        <div className="w-[88vw] max-w-80 h-[65vh] max-h-96 card flex flex-col mb-2 shadow-2xl">
          {/* LISTA */}
          {vista === "lista" && (
            <>
              <div className="p-3 border-b border-base-600 flex items-center justify-between">
                <span className="text-sm font-medium">Equipo</span>
                <button onClick={() => setVista("nueva")} className="btn-secondary text-xs px-2 py-1">+ Nueva</button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {conversaciones.length === 0 && <p className="text-xs text-gray-500 text-center mt-6 px-4">Aún no tienes conversaciones. Crea una nueva.</p>}
                {conversaciones.map((c) => (
                  <button key={c.id} onClick={() => abrirConversacion(c)} className="w-full text-left px-3 py-2 hover:bg-base-700 border-b border-base-700">
                    <p className="text-sm">{c.tipo === "grupo" ? "👥 " : "● "}{nombreConversacion(c)}</p>
                    {c.tipo === "grupo" && <p className="text-[10px] text-gray-500">{c.participantes.length} integrantes</p>}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* NUEVA CONVERSACIÓN */}
          {vista === "nueva" && (
            <>
              <div className="p-3 border-b border-base-600 flex items-center gap-2">
                <button onClick={() => setVista("lista")} className="text-gray-400 text-sm">←</button>
                <span className="text-sm font-medium">Nueva conversación</span>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {perfiles.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm px-2 py-1.5 hover:bg-base-700 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={seleccionados.includes(p.id)}
                      onChange={(e) =>
                        setSeleccionados((s) => (e.target.checked ? [...s, p.id] : s.filter((id) => id !== p.id)))
                      }
                      className="accent-accent"
                    />
                    {p.nombre_completo}
                  </label>
                ))}
              </div>
              {seleccionados.length > 1 && (
                <div className="px-3 pb-2">
                  <input value={nombreGrupo} onChange={(e) => setNombreGrupo(e.target.value)} placeholder="Nombre del grupo" className="input-field text-sm py-1" />
                </div>
              )}
              <div className="p-2 border-t border-base-600">
                <button onClick={crearConversacion} disabled={seleccionados.length === 0} className="btn-primary w-full text-sm">
                  {seleccionados.length > 1 ? "Crear grupo" : "Iniciar chat"}
                </button>
              </div>
            </>
          )}

          {/* CONVERSACIÓN ACTIVA */}
          {vista === "conversacion" && conversacionActiva && (
            <>
              <div className="p-3 border-b border-base-600 flex items-center gap-2">
                <button onClick={() => setVista("lista")} className="text-gray-400 text-sm">←</button>
                <span className="text-sm font-medium">{nombreConversacion(conversacionActiva)}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {mensajes.map((m) => (
                  <div key={m.id} className={`text-sm px-3 py-1.5 rounded-lg max-w-[85%] ${m.autor_id === userId ? "bg-accent/20 ml-auto" : "bg-base-700"}`}>
                    {m.contenido}
                  </div>
                ))}
                {mensajes.length === 0 && <p className="text-xs text-gray-500 text-center mt-4">Sin mensajes todavía.</p>}
              </div>
              <div className="p-2 border-t border-base-600 flex gap-2">
                <input
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && enviar()}
                  placeholder="Escribe un mensaje..."
                  className="input-field text-sm flex-1"
                />
                <button onClick={enviar} className="btn-primary text-sm px-3">➤</button>
              </div>
            </>
          )}
        </div>
      )}
      <button
        onClick={() => {
          setAbierto(!abierto);
          setVista("lista");
        }}
        className="w-12 h-12 rounded-full bg-base-700 border border-base-600 shadow-lg flex items-center justify-center ml-auto"
      >
        👥
      </button>
    </div>
  );
}
