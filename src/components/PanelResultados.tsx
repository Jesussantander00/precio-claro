"use client";

import { useEffect, useMemo, useState } from "react";
import { EXPECTATIVAS } from "@/lib/data";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { ENCUESTAS_SIMULADAS, type EncuestaSimulada } from "@/lib/simuladas";

type Source = "supabase" | "local" | "cargando";
type Filtro = "todas" | "si" | "no" | "no_seguro";

const SOB_LABEL: Record<EncuestaSimulada["sobrecobro"], string> = {
  si: "Sí sintió sobrecobro",
  no: "No sintió sobrecobro",
  no_seguro: "No está seguro",
};

function Bar({ label, value, total, tone }: { label: string; value: number; total: number; tone?: "warn" | "acc" }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="hbar">
      <span className="hl">{label}</span>
      <span className={`ht${tone ? ` ${tone}` : ""}`} aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </span>
      <span className="hv">
        {value} · {pct}%
      </span>
    </div>
  );
}

export default function PanelResultados() {
  const [rows, setRows] = useState<EncuestaSimulada[]>(ENCUESTAS_SIMULADAS);
  const [source, setSource] = useState<Source>("cargando");
  const [filtro, setFiltro] = useState<Filtro>("todas");

  useEffect(() => {
    let alive = true;
    (async () => {
      const supabase = getSupabaseClient();
      if (!supabase) {
        if (alive) setSource("local");
        return;
      }
      const { data, error } = await supabase
        .from("encuestas")
        .select("sobrecobro, sobrecobro_detalle, expectativas, usabilidad_estrellas, comentario, created_at")
        .eq("es_simulada", true)
        .order("created_at", { ascending: true });
      if (!alive) return;
      if (error || !data || data.length === 0) {
        setSource("local");
        return;
      }
      setRows(
        (data as EncuestaSimulada[]).map((r) => ({
          ...r,
          expectativas: r.expectativas || [],
          usabilidad_estrellas: r.usabilidad_estrellas || 0,
        }))
      );
      setSource("supabase");
    })();
    return () => {
      alive = false;
    };
  }, []);

  const stats = useMemo(() => {
    const n = rows.length;
    const sob = { si: 0, no: 0, no_seguro: 0 };
    rows.forEach((r) => (sob[r.sobrecobro] += 1));
    const exp: Record<string, number> = {};
    EXPECTATIVAS.forEach((e) => (exp[e] = 0));
    rows.forEach((r) => r.expectativas.forEach((e) => (exp[e] = (exp[e] || 0) + 1)));
    const stars = [0, 0, 0, 0, 0, 0];
    rows.forEach((r) => {
      if (r.usabilidad_estrellas >= 1 && r.usabilidad_estrellas <= 5) stars[r.usabilidad_estrellas] += 1;
    });
    const rated = rows.filter((r) => r.usabilidad_estrellas > 0);
    const avg = rated.length ? rated.reduce((s, r) => s + r.usabilidad_estrellas, 0) / rated.length : 0;
    const topExp = Object.entries(exp).sort((a, b) => b[1] - a[1])[0];
    const conComentario = rows.filter((r) => r.comentario || r.sobrecobro_detalle).length;
    return { n, sob, exp, stars, avg, topExp, conComentario };
  }, [rows]);

  const visibles = rows.filter((r) => filtro === "todas" || r.sobrecobro === filtro).slice().reverse();
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div id="panelView">
      <div className="sim-banner" role="note">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flex: "none", marginTop: 2 }}>
          <path d="M12 3 22 20H2L12 3Z" fill="var(--accent)" />
          <path d="M12 9.5v4.2" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="16.6" r="1.1" fill="#fff" />
        </svg>
        <p>
          <strong>Datos simulados.</strong> Estas 20 respuestas fueron generadas aleatoriamente para
          demostrar cómo funciona el panel. <strong>No son resultados de trabajo de campo</strong> ni
          representan la opinión real de turistas; no deben citarse como evidencia empírica.{" "}
          <span className="src-pill">
            {source === "supabase"
              ? "Origen: Supabase (es_simulada = true)"
              : source === "local"
                ? "Origen: copia local de demostración"
                : "Cargando…"}
          </span>
        </p>
      </div>

      <div className="kpi-grid">
        <div className="kpi">
          <span className="kn">{stats.n}</span>
          <span className="kl">encuestas simuladas</span>
        </div>
        <div className="kpi">
          <span className="kn">{stats.n ? Math.round((stats.sob.si / stats.n) * 100) : 0}%</span>
          <span className="kl">sintió sobrecobro</span>
        </div>
        <div className="kpi">
          <span className="kn">{stats.avg ? stats.avg.toFixed(1) : "—"} ★</span>
          <span className="kl">facilidad de uso promedio</span>
        </div>
        <div className="kpi">
          <span className="kn">{stats.conComentario}</span>
          <span className="kl">con relato o comentario</span>
        </div>
      </div>

      <div className="chart-card">
        <h4>¿Sintió que le cobraron de más?</h4>
        <Bar label="Sí" value={stats.sob.si} total={stats.n} tone="warn" />
        <Bar label="No" value={stats.sob.no} total={stats.n} />
        <Bar label="No está seguro" value={stats.sob.no_seguro} total={stats.n} tone="acc" />
      </div>

      <div className="chart-card">
        <h4>¿Qué esperaría que la app le ayude a hacer?</h4>
        {EXPECTATIVAS.map((e) => (
          <Bar key={e} label={e} value={stats.exp[e] || 0} total={stats.n} />
        ))}
        <p className="map-note">Pregunta de respuesta múltiple: los porcentajes no suman 100 %.</p>
      </div>

      <div className="chart-card">
        <h4>Facilidad de uso del prototipo (1–5 estrellas)</h4>
        {[5, 4, 3, 2, 1].map((s) => (
          <Bar key={s} label={`${s} ${s === 1 ? "estrella" : "estrellas"}`} value={stats.stars[s]} total={stats.n} tone="acc" />
        ))}
      </div>

      <div className="section-title">
        <h3>Respuestas individuales</h3>
        <span>{visibles.length} de {rows.length}</span>
      </div>
      <div className="chiprow map-filters" aria-label="Filtrar respuestas">
        {(
          [
            ["todas", "Todas"],
            ["si", "Sí hubo sobrecobro"],
            ["no", "No"],
            ["no_seguro", "No seguro"],
          ] as [Filtro, string][]
        ).map(([k, l]) => (
          <button key={k} type="button" className="chip" aria-pressed={filtro === k ? "true" : "false"} onClick={() => setFiltro(k)}>
            {l}
          </button>
        ))}
      </div>
      <div className="resp-list">
        {visibles.map((r, i) => (
          <div className="resp" key={`${r.created_at}-${i}`}>
            <div className="rtop">
              <span className={`rtag ${r.sobrecobro === "si" ? "si" : r.sobrecobro === "no" ? "no" : "ns"}`}>
                {SOB_LABEL[r.sobrecobro]}
              </span>
              <span className="rdate mono">
                {fmt(r.created_at)} · {"★".repeat(r.usabilidad_estrellas)}
                {"☆".repeat(5 - r.usabilidad_estrellas)}
              </span>
            </div>
            {r.sobrecobro_detalle && <q>{r.sobrecobro_detalle}</q>}
            {r.expectativas.length > 0 && <span className="rexp">Espera: {r.expectativas.join(" · ")}</span>}
            {r.comentario && <q>{r.comentario}</q>}
            <span className="src-pill" style={{ alignSelf: "flex-start" }}>simulada</span>
          </div>
        ))}
      </div>
      <p className="local-note">
        Las 20 respuestas se guardan en la tabla <code>encuestas</code> de Supabase con la marca
        <code> es_simulada = true</code>, de modo que nunca se mezclan con las respuestas reales del
        formulario de la pestaña Encuesta.
      </p>
    </div>
  );
}
