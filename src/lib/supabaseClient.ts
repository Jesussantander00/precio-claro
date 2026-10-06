import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type PrestadorInsert = {
  nombre_negocio: string;
  tipo_servicio: "transporte" | "playa_restaurante" | "otro" | null;
  tipo_servicio_otro: string | null;
  zona: string;
  oferta_precio: string;
  oportunidad: string | null;
};

export type PrestadorRow = PrestadorInsert & {
  id: string;
  created_at: string;
};

export type EncuestaInsert = {
  sobrecobro: "si" | "no" | "no_seguro";
  sobrecobro_detalle: string | null;
  expectativas: string[];
  usabilidad_estrellas: number | null;
  comentario: string | null;
};

export type EncuestaRow = EncuestaInsert & {
  id: string;
  created_at: string;
  // true = respuesta simulada de demostración (no es trabajo de campo real).
  es_simulada?: boolean;
};

let cachedClient: SupabaseClient | null | undefined;

/**
 * Crea (una sola vez) y devuelve el cliente de Supabase, o null si las
 * variables de entorno públicas no están configuradas todavía. Se construye
 * de forma perezosa para que `npm run build` no falle cuando las variables
 * no existen en el entorno de compilación (por ejemplo, en este sandbox).
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient !== undefined) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    cachedClient = null;
    return cachedClient;
  }

  cachedClient = createClient(url, anonKey);
  return cachedClient;
}
