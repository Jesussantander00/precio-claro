import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null | undefined;

/**
 * Crea (una sola vez) y devuelve el cliente de Supabase para el navegador,
 * usado por Supabase Auth (inicio de sesión con Google) en Componentes de
 * Cliente. Devuelve null si las variables de entorno públicas no están
 * configuradas todavía, siguiendo el mismo patrón perezoso de
 * `src/lib/supabaseClient.ts`, para que `npm run build` no falle cuando las
 * variables no existen en el entorno de compilación (por ejemplo, en este
 * sandbox).
 */
export function getBrowserSupabaseClient(): SupabaseClient | null {
  if (cachedClient !== undefined) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    cachedClient = null;
    return cachedClient;
  }

  cachedClient = createBrowserClient(url, anonKey);
  return cachedClient;
}
