"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ZONES_MAP } from "@/lib/data";
import { getSupabaseClient } from "@/lib/supabaseClient";

type Resena = {
  id: string;
  created_at: string;
  user_id: string | null;
  zona_id: string;
  estrellas: number;
  comentario: string | null;
  es_simulada: boolean;
};

const ZONA_NOMBRE: Record<string, string> = Object.fromEntries(ZONES_MAP.map((z) => [z.id, z.name]));
const STAR_LABELS = ["", "Muy mala", "Mala", "Regular", "Buena", "Muy buena"];

function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

function Stars({ n }: { n: number }) {
  return (
    <span className="rs-stars" aria-label={`${n} de 5 estrellas`}>
      {"★".repeat(n)}
      <span className="rs-stars-off">{"★".repeat(5 - n)}</span>
    </span>
  );
}

/**
 * Vista de reseñas: cualquier persona con sesión iniciada puede publicar una
 * reseña sobre una zona y ver las de los demás. Las reseñas marcadas como
 * "demostración" son ejemplos simulados, no opiniones reales.
 */
export default function ResenasView() {
  const [rows, setRows] = useState<Resena[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [meId, setMeId] = useState<string | null>(null);

  const [zona, setZona] = useState<string>(ZONES_MAP[0].id);
  const [stars, setStars] = useState(0);
  const [comentario, setComentario] = useState("");
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [filtro, setFiltro] = useState<string>("todas");

  const load = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setLoadError(true);
      setLoading(false);
      return;
    }
    const [{ data: u }, { data, error }] = await Promise.all([
      supabase.auth.getUser(),
      supabase
        .from("resenas")
        .select("id, created_at, user_id, zona_id, estrellas, comentario, es_simulada")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    setMeId(u.user?.id ?? null);
    if (error || !data) {
      setLoadError(true);
    } else {
      setLoadError(false);
      setRows(data as Resena[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial async desde Supabase
    load();
  }, [load]);

  const resumen = useMemo(() => {
    return ZONES_MAP.map((z) => {
      const rs = rows.filter((r) => r.zona_id === z.id);
      const avg = rs.length ? rs.reduce((a, r) => a + r.estrellas, 0) / rs.length : 0;
      return { id: z.id, name: z.name, n: rs.length, avg };
    });
  }, [rows]);

  const visibles = useMemo(
    () => rows.filter((r) => filtro === "todas" || r.zona_id === filtro),
    [rows, filtro]
  );

  async function enviar() {
    setFormError(null);
    setSent(false);
    if (stars < 1) {
      setFormError("Elige de 1 a 5 estrellas para tu reseña.");
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase) {
      setFormError("No se pudo conectar con la base de datos.");
      return;
    }
    setSending(true);
    const { error } = await supabase.from("resenas").insert({
      zona_id: zona,
      estrellas: stars,
      comentario: comentario.trim() || null,
    });
    setSending(false);
    if (error) {
      setFormError("No se pudo publicar tu reseña. Intenta de nuevo en unos minutos.");
      return;
    }
    setStars(0);
    setComentario("");
    setSent(true);
    load();
  }

  async function borrar(id: string) {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from("resenas").delete().eq("id", id);
    if (!error) setRows((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div id="resenasView">
      <div className="sim-banner" role="note">
        <p>
          <strong>Opiniones de usuarios, no verificadas.</strong> Las reseñas las escriben personas con sesión
          iniciada y no sustituyen la tarifa oficial. Las marcadas “demostración” son ejemplos simulados. No
          escribas datos personales.
        </p>
      </div>

      <div className="section-title">
        <h3>Calificación por zona</h3>
        <span>{rows.length} {rows.length === 1 ? "reseña" : "reseñas"}</span>
      </div>
      <div className="chiprow" aria-label="Filtrar reseñas por zona">
        <button
          className="chip"
          type="button"
          aria-pressed={filtro === "todas" ? "true" : "false"}
          onClick={() => setFiltro("todas")}
        >
          Todas
        </button>
        {resumen.map((z) => (
          <button
            key={z.id}
            className="chip"
            type="button"
            aria-pressed={filtro === z.id ? "true" : "false"}
            onClick={() => setFiltro(z.id)}
          >
            {z.name} · {z.n ? `${z.avg.toFixed(1)} ★ (${z.n})` : "sin reseñas"}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 14, marginBottom: 14 }}>
        <div className="field">
          <label className="field-label" htmlFor="rsZona">
            ¿Sobre qué zona quieres opinar?
          </label>
          <select className="text-input" id="rsZona" value={zona} onChange={(e) => setZona(e.target.value)}>
            {ZONES_MAP.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <span className="field-label">¿Cómo fue el trato y el cobro de precios?</span>
          <div>
            <span className="star-picker" role="radiogroup" aria-label="Calificación de 1 a 5 estrellas">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  className={i <= stars ? "on" : ""}
                  role="radio"
                  aria-checked={i === stars ? "true" : "false"}
                  aria-label={`${i} de 5`}
                  onClick={() => setStars(i)}
                >
                  ★
                </button>
              ))}
            </span>
            <span className="star-picker-label">{STAR_LABELS[stars]}</span>
          </div>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="rsComentario">
            Tu opinión (opcional, máximo 300 caracteres)
          </label>
          <textarea
            className="textarea"
            id="rsComentario"
            maxLength={300}
            placeholder="Ej: El taxi cobró la tarifa oficial."
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
          />
        </div>
        <button className="btn block" type="button" onClick={enviar} disabled={sending}>
          {sending ? "Publicando…" : "Publicar reseña"}
        </button>
        {formError && <p className="error-note">{formError}</p>}
        {sent && (
          <p className="local-note" role="status">
            ¡Gracias! Tu reseña quedó publicada.
          </p>
        )}
      </div>

      <div className="section-title">
        <h3>{filtro === "todas" ? "Últimas reseñas" : `Reseñas de ${ZONA_NOMBRE[filtro]}`}</h3>
        <span>{visibles.length}</span>
      </div>

      {loading && <p className="local-note">Cargando reseñas…</p>}
      {!loading && loadError && (
        <p className="error-note">
          No se pudieron cargar las reseñas. Si el administrador aún no activó esta función en la base de datos,
          vuelve a intentarlo más tarde.
        </p>
      )}
      {!loading && !loadError && visibles.length === 0 && (
        <p className="local-note">Todavía no hay reseñas para esta zona. ¡Sé la primera persona en opinar!</p>
      )}
      <ul className="rs-list">
        {visibles.map((r) => (
          <li key={r.id} className="rs-item">
            <div className="rs-head">
              <Stars n={r.estrellas} />
              <span className="rs-zona">{ZONA_NOMBRE[r.zona_id] ?? r.zona_id}</span>
              {r.es_simulada && <span className="rs-tag">demostración</span>}
            </div>
            {r.comentario && <p className="rs-text">{r.comentario}</p>}
            <div className="rs-foot">
              <span>
                {r.es_simulada ? "Usuario de demostración" : r.user_id === meId ? "Tú" : `Usuario ${r.user_id?.slice(0, 4) ?? ""}`}
                {" · "}
                {fechaCorta(r.created_at)}
              </span>
              {!r.es_simulada && r.user_id === meId && (
                <button className="rs-del" type="button" onClick={() => borrar(r.id)}>
                  Borrar
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
