import { NextResponse, type NextRequest } from "next/server";
import { getServerSupabaseClient } from "@/lib/supabase/server";

// Route Handler que recibe el `code` de OAuth que devuelve Google/Supabase,
// lo intercambia por una sesión (cookies httpOnly) y redirige de vuelta a la
// app — a `next` si vino indicado (por ejemplo, desde /login?next=/?tab=encuesta),
// o a la raíz por defecto.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") || "/";
  // Solo se permite una ruta relativa dentro de la misma app (evita
  // redirecciones abiertas a otros dominios vía el parámetro `next`).
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  if (code) {
    const supabase = await getServerSupabaseClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(new URL(next, origin));
      }
    }
  }

  // Si algo falló (sin código, sin Supabase configurado, o error al
  // intercambiar el código), volvemos al login.
  return NextResponse.redirect(new URL("/login", origin));
}
