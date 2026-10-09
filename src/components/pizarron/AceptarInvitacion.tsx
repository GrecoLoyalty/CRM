"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { aceptarInvitacionPizarron } from "@/app/dashboard/pizarron/actions";

export default function AceptarInvitacion({ token }: { token: string }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");

  async function aceptar() {
    setOcupado(true);
    setError("");
    const resultado = await aceptarInvitacionPizarron(token);
    setOcupado(false);
    if (resultado.error) {
      setError(resultado.error);
      return;
    }
    router.push("/dashboard/pizarron");
    router.refresh();
  }

  return (
    <div className="mt-6">
      <button className="btn-primary w-full" onClick={aceptar} disabled={ocupado}>
        {ocupado ? "Agregando pizarrón…" : "Agregar a mis pizarrones"}
      </button>
      {error && <p role="alert" className="mt-3 text-sm text-signal-urgent">{error}</p>}
    </div>
  );
}
