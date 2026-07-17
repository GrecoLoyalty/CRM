"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ChatWidget({ userId, esCeo }: { userId: string; esCeo: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);
  const [clienteId, setClienteId] = useState<string>("");
  const [mensajes, setMensajes] = useState<any[]>([]);
  const [texto, setTexto] = useState("");
  const supabase = createClient();

  useEffect(() => {
    if (!abierto) return;
    (async () => {
      const { data } = await supabase.from("clientes").select("id, nombre_empresa").neq("estado", "HISTORICO").order("nombre_empresa");
      setClientes(data || []);
    })();
  }, [abierto]);

  // Permite que otras partes de la app (ej. "Abrir chat" en una tarea) abran
  // este widget directamente en la conversación de un cliente específico.
  useEffect(() => {
    function onAbrirChatCliente(e: Event) {
      const id = (e as CustomEvent<string>).detail;
      if (!id) return;
      setAbierto(true);
      setClienteId(id);
    }
    window.addEventListener("gresanova:abrir-chat-cliente", onAbrirChatCliente);
    return () => window.removeEventListener("gresanova:abrir-chat-cliente", onAbrirChatCliente);
  }, []);

  useEffect(() => {
    if (!clienteId) return;
    (async () => {
      const { data } = await supabase.from("chat_mensajes").select("*").eq("cliente_id", clienteId).order("created_at");
      setMensajes(data || []);
    })();

    const canal = supabase
      .channel(`chat-${clienteId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_mensajes", filter: `cliente_id=eq.${clienteId}` }, (payload) => {
        setMensajes((m) => [...m, payload.new]);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId]);

  async function enviar() {
    if (!texto.trim() || !clienteId) return;
    await supabase.from("chat_mensajes").insert({ cliente_id: clienteId, autor_id: userId, es_ceo: esCeo, contenido: texto });
    setTexto("");
  }

  return (
    <div className="fixed bottom-4 right-4 md:bottom-5 md:right-5 z-40">
      {abierto && (
        <div className="w-[88vw] max-w-80 h-[65vh] max-h-96 card flex flex-col mb-2 shadow-2xl">
          <div className="p-3 border-b border-base-600">
            <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="input-field text-sm py-1">
              <option value="">Selecciona un cliente...</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre_empresa}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {mensajes.map((m) => (
              <div key={m.id} className={`text-sm px-3 py-1.5 rounded-lg max-w-[85%] ${m.autor_id === userId ? "bg-accent/20 ml-auto" : "bg-base-700"} ${m.es_ceo ? "border border-signal-warn/40" : ""}`}>
                {m.es_ceo && <span className="text-[10px] text-signal-warn block">CEO</span>}
                {m.contenido}
              </div>
            ))}
            {clienteId && mensajes.length === 0 && <p className="text-xs text-gray-500 text-center mt-4">Sin mensajes todavía.</p>}
          </div>
          {clienteId && (
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
          )}
        </div>
      )}
      <button onClick={() => setAbierto(!abierto)} className="w-12 h-12 rounded-full bg-accent text-base-900 font-bold shadow-lg flex items-center justify-center ml-auto">
        💬
      </button>
    </div>
  );
}
