"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function PublicarBanner() {
  const [mensaje, setMensaje] = useState("");
  const [nivel, setNivel] = useState("informativo");
  const [horasExpira, setHorasExpira] = useState(24);
  const [enviando, setEnviando] = useState(false);
  const router = useRouter();

  async function publicar() {
    if (!mensaje.trim()) return;
    setEnviando(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const expira = new Date(Date.now() + horasExpira * 3600_000).toISOString();

    await supabase.from("banners_urgencia").insert({
      autor_id: user?.id,
      nivel,
      mensaje,
      expira_at: expira,
    });

    setMensaje("");
    setEnviando(false);
    router.refresh();
  }

  return (
    <div className="card p-5">
      <h2 className="font-display font-semibold mb-3">Publicar banner de urgencia</h2>
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <div className="flex-1">
          <label className="label-field">Mensaje</label>
          <input value={mensaje} onChange={(e) => setMensaje(e.target.value)} className="input-field" placeholder="Anuncio para todo el equipo..." />
        </div>
        <div>
          <label className="label-field">Nivel</label>
          <select value={nivel} onChange={(e) => setNivel(e.target.value)} className="input-field">
            <option value="informativo">Informativo</option>
            <option value="importante">Importante</option>
            <option value="urgente">Urgente</option>
          </select>
        </div>
        <div>
          <label className="label-field">Expira en (horas)</label>
          <input type="number" min={1} value={horasExpira} onChange={(e) => setHorasExpira(Number(e.target.value))} className="input-field w-24" />
        </div>
        <button onClick={publicar} disabled={enviando} className="btn-primary">
          {enviando ? "Publicando..." : "Publicar"}
        </button>
      </div>
    </div>
  );
}
