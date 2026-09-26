import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Crea un cliente de Supabase para usar en Server Components, Route Handlers
 * y Server Functions, siguiendo el patrón oficial de `@supabase/ssr` con
 * `next/headers` (cookies() es asíncrono desde Next.js 15+). Devuelve null si
 * las variables de entorno públicas no están configuradas todavía, para no
 * romper `npm run build` ni el arranque de la app en entornos sin Supabase
 * configurado.
 *
 * Nota: llamar `cookieStore.set(...)` fuera de un Server Function o Route
 * Handler (por ejemplo, desde un Server Component) lanza un error de
 * Next.js; el try/catch de abajo lo ignora a propósito, tal como recomienda
 * la documentación de Supabase, porque en ese caso el middleware/proxy ya se
 * encarga de refrescar la sesión.
 */
export async function getServerSupabaseClient(): Promise<SupabaseClient | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Se puede ignorar si esto se llama desde un Server Component.
          // Es seguro ignorarlo si hay un proxy que refresca las sesiones
          // de usuario.
        }
      },
    },
  });
}
