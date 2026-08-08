"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Icon from "@/components/ui/Icon";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

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
    const destino = searchParams?.get("next") || "/dashboard";
    router.push(destino);
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-base-900 relative overflow-hidden px-4">
      {/* Firma visual: cuadrícula de "flujo en cascada" del manual de marca */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.07]"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <pattern id="flow" width="120" height="120" patternUnits="userSpaceOnUse">
            <path d="M0 60 H120 M60 0 V120" stroke="#2F8BFF" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#flow)" />
      </svg>

      {/* Halo de acento detrás de la tarjeta */}
      <div
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                   w-[520px] h-[520px] rounded-full blur-3xl
                   bg-accent/12 pointer-events-none"
      />

      <div className="relative w-full max-w-sm animate-slide-up">
        <div className="mb-7 text-center">
          <div className="inline-flex items-center gap-2.5 mb-3">
            <div
              className="w-9 h-9 rounded-lg bg-accent shadow-glow-accent flex items-center
                         justify-center font-display font-bold text-base-950"
            >
              G
            </div>
            <span className="font-display text-xl font-semibold tracking-tight text-gray-50">
              GRESANOVA
            </span>
          </div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500">
            Sistema Operativo Interno
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card-neon p-6 space-y-4">
          <div>
            <label htmlFor="email" className="label-field">
              Correo
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="tu@gresanova.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="label-field">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-signal-urgent/40
                         bg-signal-urgent/10 px-3 py-2 animate-fade-in"
            >
              <Icon
                name="alerta"
                className="w-4 h-4 text-signal-urgent shrink-0 mt-0.5"
              />
              <p className="text-sm text-signal-urgent">{error}</p>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeOpacity="0.25"
                  />
                  <path
                    d="M21 12a9 9 0 0 0-9-9"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
                Entrando…
              </>
            ) : (
              "Entrar"
            )}
          </button>
        </form>

        <div className="mt-6 space-y-2 text-center">
          <a
            href="/solicitar-acceso"
            className="inline-block text-xs text-gray-400 hover:text-accent-soft
                       transition-colors duration-200"
          >
            ¿Nuevo en el equipo? Solicitá acceso
          </a>
          <p className="text-[11px] text-gray-600">Confidencial — Solo uso interno</p>
        </div>
      </div>
    </main>
  );
}
