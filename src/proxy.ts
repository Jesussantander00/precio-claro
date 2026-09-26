// En Next.js 16 el archivo antes llamado `middleware.ts` se renombró a
// `proxy.ts` (la función sigue haciendo exactamente lo mismo: correr antes
// de que se resuelva la ruta). Precio Claro usa este archivo para exigir
// inicio de sesión con Google en TODA la app, según la decisión del
// propietario del proyecto de que también las pestañas de consulta de
// tarifas queden detrás del login.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Rutas que cualquier persona (con o sin sesión) puede visitar sin ser
// redirigida a /login: la propia página de login y el callback de OAuth.
const PUBLIC_PATHS = ["/login", "/auth/callback"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Si Supabase no está configurado todavía (por ejemplo, en un entorno de
  // desarrollo o build sin las variables de entorno), dejamos pasar la
  // petición sin autenticar en lugar de fallar: así `npm run build` y
  // `npm run dev` siguen funcionando antes de configurar Supabase, y solo
  // se exige el login una vez que el proyecto está conectado de verdad.
  if (!url || !anonKey) {
    return NextResponse.next();
  }

  // Patrón oficial de Supabase + Next.js: se crea una respuesta "de trabajo"
  // que se va actualizando junto con la petición para poder refrescar la
  // cookie de sesión en cada llamada.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // IMPORTANTE: no quitar este `getUser()`. Refresca el token de sesión (si
  // hace falta) y es lo que nos dice, de forma confiable, si hay alguien
  // autenticado — a diferencia de leer la cookie directamente.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isPublicPath(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Aplica a todas las rutas excepto:
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico, sitemap.xml, robots.txt (archivos de metadatos)
     * - archivos con extensión (imágenes, fuentes, etc. servidos desde /public)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};
