"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function SolicitarAccesoPage() {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    const supabase = createClient();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre_completo: nombre, nota_solicitud: nota },
      },
    });

    setEnviando(false);
    if (error) {
      setError(error.message.includes("already registered") ? "Ese correo ya tiene una cuenta." : "No se pudo enviar la solicitud. Intenta de nuevo.");
      return;
    }
    setEnviado(true);
  }

  if (enviado) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-base-900 px-6">
        <div className="card p-8 max-w-sm text-center">
          <div className="text-3xl mb-3">✓</div>
          <h1 className="font-display text-xl font-semibold mb-2">Solicitud enviada</h1>
          <p className="text-sm text-gray-400">
            Tu cuenta quedó registrada y pendiente de aprobación. Un administrador la va a revisar y activar con el rol correspondiente. Te avisarán cuando puedas entrar.
          </p>
          <Link href="/login" className="btn-secondary inline-block mt-5 text-sm">Volver al login</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-base-900 px-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center font-display font-bold text-base-900">G</div>
            <span className="font-display text-xl tracking-tight">GRESANOVA</span>
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Solicitar acceso</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="label-field">Nombre completo</label>
            <input required value={nombre} onChange={(e) => setNombre(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="label-field">Correo</label>
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="label-field">Contraseña</label>
            <input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="label-field">¿A qué área perteneces? (opcional)</label>
            <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej. Vendedor, Diseñador, etc." className="input-field" />
          </div>
          {error && <p className="text-signal-urgent text-sm">{error}</p>}
          <button type="submit" disabled={enviando} className="btn-primary w-full">
            {enviando ? "Enviando..." : "Solicitar acceso"}
          </button>
          <p className="text-center text-xs text-gray-500">
            Tu cuenta quedará <span className="text-gray-300">pendiente de aprobación</span> hasta que un administrador te asigne un rol.
          </p>
        </form>

        <p className="text-center text-xs text-gray-600 mt-6">
          <Link href="/login" className="underline hover:text-gray-400">¿Ya tienes cuenta? Entra aquí</Link>
        </p>
      </div>
    </main>
  );
}
