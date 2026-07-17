"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("Correo o contraseña incorrectos.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-base-900 relative overflow-hidden">
      {/* Signature: líneas de flujo de fondo, referencian el "flujo en cascada" del manual */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.07]" preserveAspectRatio="none">
        <defs>
          <pattern id="flow" width="120" height="120" patternUnits="userSpaceOnUse">
            <path d="M0 60 H120 M60 0 V120" stroke="#3AA7A1" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#flow)" />
      </svg>

      <div className="relative w-full max-w-sm px-6">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center font-display font-bold text-base-900">G</div>
            <span className="font-display text-xl tracking-tight">GRESANOVA</span>
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Sistema Operativo Interno</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="label-field">Correo</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="tu@gresanova.com"
            />
          </div>
          <div>
            <label className="label-field">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-signal-urgent text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
        <p className="text-center text-xs text-gray-600 mt-6">Confidencial — Solo uso interno</p>
        <p className="text-center text-xs text-gray-500 mt-2">
          <a href="/solicitar-acceso" className="underline hover:text-gray-400">¿Nuevo en el equipo? Solicita acceso</a>
        </p>
      </div>
    </main>
  );
}
