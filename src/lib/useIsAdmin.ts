"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";

/**
 * Indica si la persona con sesión iniciada es administradora.
 *
 * La tabla `admins` tiene una política RLS que solo deja ver la fila del propio
 * correo, de modo que si la consulta devuelve una fila, la persona es admin.
 * Esto solo decide qué se muestra en la interfaz: la protección real de los
 * datos está en las políticas RLS de Supabase (`public.is_admin()`), así que
 * aunque alguien abra `?tab=panel` a mano, la base de datos no le entrega las
 * respuestas de la encuesta.
 */
export function useIsAdmin(): { isAdmin: boolean; loading: boolean } {
  const [state, setState] = useState<{ isAdmin: boolean; loading: boolean }>({
    isAdmin: false,
    loading: true,
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      const supabase = getSupabaseClient();
      if (!supabase) {
        if (alive) setState({ isAdmin: false, loading: false });
        return;
      }
      const { data, error } = await supabase.from("admins").select("email").limit(1);
      if (!alive) return;
      setState({ isAdmin: !error && !!data && data.length > 0, loading: false });
    })();
    return () => {
      alive = false;
    };
  }, []);

  return state;
}
