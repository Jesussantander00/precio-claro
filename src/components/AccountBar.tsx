"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";

function truncateEmail(email: string, max = 22): string {
  if (email.length <= max) return email;
  return `${email.slice(0, max - 1)}…`;
}

/**
 * Indicador de cuenta + botón "Cerrar sesión" para el masthead. Se muestra
 * solo si hay una sesión activa (si Supabase no está configurado, o nadie ha
 * iniciado sesión, no renderiza nada — el proxy ya se encarga de exigir el
 * login en las rutas protegidas).
 */
export default function AccountBar() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const supabase = getBrowserSupabaseClient();

  useEffect(() => {
    if (!supabase) return;

    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (active) setEmail(data.user?.email ?? null);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setEmail(session?.user?.email ?? null);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSignOut() {
    if (!supabase) return;
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (!email) return null;

  return (
    <div className="account-bar">
      <span className="account-email" title={email}>
        {truncateEmail(email)}
      </span>
      <button className="btn-signout" type="button" onClick={handleSignOut} disabled={signingOut}>
        {signingOut ? "Saliendo…" : "Cerrar sesión"}
      </button>
    </div>
  );
}
