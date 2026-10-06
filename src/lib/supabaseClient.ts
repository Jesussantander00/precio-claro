import type { SupabaseClient } from "@supabase/supabase-js";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";

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

/**
 * Devuelve el cliente de Supabase del navegador, o null si las variables de
 * entorno públicas no están configuradas (por ejemplo, en el build del
 * sandbox). Reutiliza el cliente con sesión (cookies de @supabase/ssr) para
 * que las consultas viajen como usuario autenticado: las políticas RLS de las
 * tablas solo permiten leer/insertar a `authenticated`, así que un cliente sin
 * la sesión de Google sería rechazado.
 */
export function getSupabaseClient(): SupabaseClient | null {
  return getBrowserSupabaseClient();
}
