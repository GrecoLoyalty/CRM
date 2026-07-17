"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

const DEPTO_LABEL: Record<string, string> = {
  ventas: "Ventas",
  analisis: "Análisis",
  estetica: "Estética",
  desarrollo: "Desarrollo",
};

const DEPTO_COLOR: Record<string, string> = {
  ventas: "bg-signal-info/15 text-signal-info",
  analisis: "bg-accent/15 text-accent-soft",
  estetica: "bg-signal-warn/15 text-signal-warn",
  desarrollo: "bg-purple-500/15 text-purple-300",
};

export default function BitacoraCliente({
  clienteId,
  userId,
  entradasIniciales,
}: {
  clienteId: string;
  userId: string;
  entradasIniciales: any[];
}) {
  const [entradas, setEntradas] = useState(entradasIniciales);
  const [contenido, setContenido] = useState("");
  const [link, setLink] = useState("");
  const [miPerfil, setMiPerfil] = useState<{ nombre_completo: string; depto: string | null } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [montado, setMontado] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    setMontado(true);
    (async () => {
      const { data } = await supabase.from("perfiles").select("nombre_completo, depto").eq("id", userId).single();
      setMiPerfil(data);
    })();

    const canal = supabase
      .channel(`bitacora-${clienteId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "cliente_bitacora", filter: `cliente_id=eq.${clienteId}` },
        (payload) => setEntradas((e) => [...e, payload.new])
      )
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId]);

  async function agregar() {
    if (!contenido.trim()) return;
    setEnviando(true);
    const { error } = await supabase.from("cliente_bitacora").insert({
      cliente_id: clienteId,
      autor_id: userId,
      autor_nombre: miPerfil?.nombre_completo || "Usuario",
      depto: miPerfil?.depto || null,
      contenido,
      link: link || null,
    });
    if (!error) {
      setContenido("");
      setLink("");
    }
    setEnviando(false);
  }

  return (
    <section className="card p-5">
      <h2 className="font-display font-semibold text-sm text-gray-400 uppercase tracking-wide mb-1">Bitácora del cliente</h2>
      <p className="text-xs text-gray-500 mb-4">Visible para todos los departamentos con acceso a este cliente. Deja aquí tu avance, notas o links.</p>

      <div className="space-y-3 mb-5 max-h-96 overflow-y-auto pr-1">
        {entradas.length === 0 && <p className="text-sm text-gray-500">Aún no hay entradas. Sé el primero en dejar una nota.</p>}
        {entradas.map((e) => (
          <div key={e.id} className="border-b border-base-700 pb-3 last:border-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium">{e.autor_nombre}</span>
              {e.depto && <span className={`text-[10px] px-2 py-0.5 rounded-full ${DEPTO_COLOR[e.depto]}`}>{DEPTO_LABEL[e.depto]}</span>}
              <span className="text-[10px] text-gray-600">
                {montado ? formatDistanceToNow(new Date(e.created_at), { addSuffix: true, locale: es }) : ""}
              </span>
            </div>
            <p className="text-sm text-gray-300 whitespace-pre-wrap">{e.contenido}</p>
            {e.link && (
              <a href={e.link} target="_blank" className="text-xs text-accent-soft underline mt-1 inline-block">
                {e.link}
              </a>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-base-600 pt-4 space-y-2">
        <textarea
          value={contenido}
          onChange={(e) => setContenido(e.target.value)}
          rows={2}
          placeholder="Escribe una actualización, nota o avance..."
          className="input-field text-sm"
        />
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Link opcional (Drive, GitHub, WeTransfer...)"
          className="input-field text-sm"
        />
        <button onClick={agregar} disabled={enviando || !contenido.trim()} className="btn-primary text-sm">
          {enviando ? "Guardando..." : "Agregar a la bitácora"}
        </button>
      </div>
    </section>
  );
}
