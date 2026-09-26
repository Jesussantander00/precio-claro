"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";

function LoginCard() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = getBrowserSupabaseClient();

  async function handleGoogleSignIn() {
    setError(null);
    if (!supabase) {
      setError(
        "Configura las variables de entorno de Supabase para activar el inicio de sesión."
      );
      return;
    }
    setLoading(true);
    const next = searchParams.get("next") || "/";
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("next", next);
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl.toString() },
    });
    if (signInError) {
      setError("No se pudo iniciar el proceso de inicio de sesión. Intenta de nuevo.");
      setLoading(false);
    }
    // Si no hay error, el navegador es redirigido a Google, así que no hace
    // falta hacer nada más aquí.
  }

  return (
    <div className="login-wrap">
      <div className="card login-card">
        <div className="masthead" style={{ justifyContent: "center" }}>
          <div className="mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M3 11.5 11.5 3H19a2 2 0 0 1 2 2v7.5L12.5 21 3 11.5Z"
                stroke="#F3FBF8"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
              <circle cx="15.5" cy="8.5" r="1.4" fill="#F3FBF8" />
            </svg>
          </div>
          <div>
            <h1>Precio Claro</h1>
          </div>
        </div>
        <p className="login-desc">
          Inicia sesión con tu cuenta de Google para consultar tarifas de referencia y participar
          en el prototipo académico de transparencia de precios turísticos en Cartagena.
        </p>
        <button
          className="btn block login-google-btn"
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62Z"
            />
            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.97v2.33A9 9 0 0 0 9 18Z"
            />
            <path
              fill="#FBBC05"
              d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.97A9 9 0 0 0 0 9c0 1.45.35 2.83.97 4.03l2.98-2.33Z"
            />
            <path
              fill="#EA4335"
              d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .97 4.97l2.98 2.33C4.66 5.17 6.65 3.58 9 3.58Z"
            />
          </svg>
          {loading ? "Redirigiendo…" : "Continuar con Google"}
        </button>
        {error && <p className="error-note">{error}</p>}
        <p className="login-footnote">
          Prototipo académico — Universidad de Cartagena. No es una aplicación oficial del
          Distrito.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginCard />
    </Suspense>
  );
}
