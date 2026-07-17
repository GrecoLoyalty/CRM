"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function PendienteAprobacion({ nombre }: { nombre: string }) {
  const router = useRouter();

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-base-900 px-6">
      <div className="card p-8 max-w-sm text-center">
        <div className="text-3xl mb-3">⏳</div>
        <h1 className="font-display text-xl font-semibold mb-2">Hola, {nombre}</h1>
        <p className="text-sm text-gray-400">
          Tu cuenta está pendiente de aprobación. Un administrador necesita asignarte un rol antes de que puedas entrar al sistema.
        </p>
        <button onClick={logout} className="btn-secondary mt-5 text-sm">Cerrar sesión</button>
      </div>
    </main>
  );
}