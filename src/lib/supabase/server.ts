import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente con permisos del usuario autenticado (respeta RLS)
export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Se puede ignorar si se llama desde un Server Component sin middleware activo
          }
        },
      },
    }
  );
}

// Cliente con permisos de servicio (bypass RLS) — SOLO usar en Server Actions/Route
// Handlers muy específicos y sensibles: bóveda, auto-asignación admin, exportes, etc.
// NUNCA exponer este cliente ni el service role key al navegador.
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
