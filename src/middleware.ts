import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Mapa de qué rol puede entrar a qué sección del dashboard.
// root y ceo tienen acceso total; los demás solo a su propia área.
// "cliente" (la ficha /dashboard/cliente/[id]) y "vista-aguila" están
// disponibles para TODOS los roles: cualquier usuario debe poder abrir
// la ficha de un cliente al que tiene acceso (RLS ya filtra los datos)
// y ver su propia Vista de Águila.
const RUTA_POR_ROL: Record<string, string[]> = {
  root: ["root", "ceo", "ventas", "analisis", "estetica", "desarrollo", "cliente", "vista-aguila"],
  ceo: ["ceo", "ventas", "analisis", "estetica", "desarrollo", "cliente", "vista-aguila"],
  analista: ["analisis", "cliente", "vista-aguila"],
  vendedor: ["ventas", "cliente", "vista-aguila"],
  produccion: ["estetica", "desarrollo", "cliente", "vista-aguila"],
};

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPortal = path.startsWith("/portal");
  const isSolicitud = path.startsWith("/solicitar-acceso");
  const isLogin = path === "/login";
  const isDashboard = path.startsWith("/dashboard");

  if (isPortal || isSolicitud) return response; // rutas públicas, no requieren sesión

  if (!user && isDashboard) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && isLogin) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (user && isDashboard) {
    const { data: perfil } = await supabase
      .from("perfiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const seccion = path.split("/")[2]; // /dashboard/<seccion>
    if (seccion && perfil) {
      const permitido = RUTA_POR_ROL[perfil.role] || [];
      if (!permitido.includes(seccion)) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
