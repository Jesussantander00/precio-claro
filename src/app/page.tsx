"use client";

import { useEffect, useMemo, useState } from "react";
import {
  SERVICES,
  CASES,
  ZONES_BY_CAT,
  ZONES_MAP,
  ACTORS,
  PRESTADOR_TIPOS,
  EXPECTATIVAS,
  SOBRECOBRO_OPTIONS,
  STAR_LABELS,
  TAB_COPY,
  money,
  starsLabel,
  type TabKey,
} from "@/lib/data";
import {
  getSupabaseClient,
  type PrestadorInsert,
  type PrestadorRow,
  type EncuestaInsert,
  type EncuestaRow,
} from "@/lib/supabaseClient";

type Theme = "system" | "light" | "dark";
const THEME_ORDER: Theme[] = ["system", "light", "dark"];
const THEME_LABELS: Record<Theme, string> = {
  system: "Tema: auto",
  light: "Tema: claro",
  dark: "Tema: oscuro",
};

type Verdict = { type: "good" | "warn"; message: string } | null;

function tipoLabelFor(value: string | null): string | null {
  if (!value) return null;
  const found = PRESTADOR_TIPOS.find((t) => t.value === value);
  return found ? found.label : value;
}

export default function Home() {
  // ---------- Tabs / masthead ----------
  const [cat, setCat] = useState<TabKey>("transporte");
  const copy = TAB_COPY[cat];

  const [themeIdx, setThemeIdx] = useState(0);
  const theme = THEME_ORDER[themeIdx];

  useEffect(() => {
    if (theme === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  function handleTabClick(tab: TabKey) {
    setCat(tab);
    if (tab === "transporte" || tab === "playa") {
      setZone("Todas");
    }
  }

  // ---------- Tarifas (Transporte / Playas) ----------
  const [zone, setZone] = useState("Todas");
  const [selected, setSelected] = useState<string | null>("taxi");
  const [paid, setPaid] = useState("");
  const [verdict, setVerdict] = useState<Verdict>(null);
  const [protocolOpen, setProtocolOpen] = useState(false);

  const tarifasCat: "transporte" | "playa" = cat === "playa" ? "playa" : "transporte";
  const items = useMemo(
    () =>
      SERVICES.filter((s) => s.cat === tarifasCat && (zone === "Todas" || s.zone === zone)),
    [tarifasCat, zone]
  );
  // Se deriva de `items` (no de SERVICES completo) para que el detalle se
  // oculte automáticamente cuando el filtro de zona excluye el servicio
  // seleccionado, sin necesitar un efecto separado para "limpiar" el estado.
  const selectedService = useMemo(() => items.find((s) => s.id === selected) || null, [items, selected]);

  function handleSelectService(id: string) {
    setSelected(id);
    setPaid("");
    setVerdict(null);
    setProtocolOpen(false);
  }

  function handleCheck() {
    if (!selectedService) return;
    const raw = paid.replace(/[^\d]/g, "");
    if (!raw) return;
    const val = parseInt(raw, 10);
    setProtocolOpen(false);
    if (val > selectedService.max) {
      const pct = Math.round(((val - selectedService.max) / selectedService.max) * 100);
      setVerdict({
        type: "warn",
        message: `Cobraron ${money(val)}, es decir ${pct}% más que el máximo de referencia (${money(
          selectedService.max
        )}) para ${selectedService.name.toLowerCase()}.`,
      });
    } else {
      const rangeTxt =
        selectedService.min === selectedService.max
          ? money(selectedService.min)
          : `${money(selectedService.min)}–${money(selectedService.max)}`;
      setVerdict({
        type: "good",
        message: `Cobraron ${money(val)}, dentro del rango de referencia (${rangeTxt}).`,
      });
    }
  }

  // ---------- Mapa ----------
  const [mapZone, setMapZone] = useState<string | null>(null);
  const selectedMapZone = useMemo(() => ZONES_MAP.find((z) => z.id === mapZone) || null, [mapZone]);

  // ---------- Actores: caracteriza tu negocio ----------
  const [presNombre, setPresNombre] = useState("");
  const [presTipo, setPresTipo] = useState<PrestadorInsert["tipo_servicio"]>(null);
  const [presZona, setPresZona] = useState("");
  const [presOferta, setPresOferta] = useState("");
  const [presOportunidad, setPresOportunidad] = useState("");
  const [presSubmitting, setPresSubmitting] = useState(false);
  const [presError, setPresError] = useState<string | null>(null);
  const [presConfirm, setPresConfirm] = useState(false);
  const [presList, setPresList] = useState<PrestadorRow[]>([]);

  async function fetchPrestadores() {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data, error } = await supabase
      .from("prestadores")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (!error && data) setPresList(data as PrestadorRow[]);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial async desde Supabase
    fetchPrestadores();
  }, []);

  async function handlePresSubmit() {
    setPresError(null);
    const nombre = presNombre.trim();
    if (!nombre) {
      document.getElementById("presNombre")?.focus();
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase) {
      setPresError(
        "No se pudo conectar con la base de datos (Supabase no está configurado en este entorno)."
      );
      return;
    }
    setPresSubmitting(true);
    const payload: PrestadorInsert = {
      nombre_negocio: nombre,
      tipo_servicio: presTipo,
      tipo_servicio_otro: null,
      zona: presZona.trim(),
      oferta_precio: presOferta.trim(),
      oportunidad: presOportunidad.trim() || null,
    };
    const { error } = await supabase.from("prestadores").insert(payload);
    setPresSubmitting(false);
    if (error) {
      setPresError("No se pudo guardar la caracterización. Intenta de nuevo en unos minutos.");
      return;
    }
    setPresNombre("");
    setPresZona("");
    setPresOferta("");
    setPresOportunidad("");
    setPresTipo(null);
    setPresConfirm(true);
    window.setTimeout(() => setPresConfirm(false), 4000);
    fetchPrestadores();
  }

  // ---------- Encuesta ----------
  const [encSobrecobro, setEncSobrecobro] = useState<"si" | "no" | "inseguro" | null>(null);
  const [encDetalle, setEncDetalle] = useState("");
  const [encExpectativas, setEncExpectativas] = useState<string[]>([]);
  const [encStars, setEncStars] = useState(0);
  const [encComentario, setEncComentario] = useState("");
  const [encSubmitting, setEncSubmitting] = useState(false);
  const [encError, setEncError] = useState<string | null>(null);
  const [encConfirm, setEncConfirm] = useState(false);
  const [encSummary, setEncSummary] = useState<{
    count: number;
    pctSobrecobro: string;
    topExpectativa: string;
    avgStars: string;
  }>({ count: 0, pctSobrecobro: "—", topExpectativa: "—", avgStars: "—" });

  async function fetchEncSummary() {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data, error } = await supabase
      .from("encuestas")
      .select("sobrecobro, expectativas, usabilidad_estrellas");
    if (error || !data) return;
    const items = data as Pick<EncuestaRow, "sobrecobro" | "expectativas" | "usabilidad_estrellas">[];
    if (!items.length) {
      setEncSummary({ count: 0, pctSobrecobro: "—", topExpectativa: "—", avgStars: "—" });
      return;
    }
    const siCount = items.filter((r) => r.sobrecobro === "si").length;
    const pct = Math.round((siCount / items.length) * 100) + "%";
    const tally: Record<string, number> = {};
    items.forEach((r) => (r.expectativas || []).forEach((e) => { tally[e] = (tally[e] || 0) + 1; }));
    const top = Object.keys(tally).sort((a, b) => tally[b] - tally[a])[0];
    const withStars = items.filter((r) => (r.usabilidad_estrellas || 0) > 0);
    const avgStars = withStars.length
      ? (
          withStars.reduce((sum, r) => sum + (r.usabilidad_estrellas || 0), 0) / withStars.length
        ).toFixed(1) + " ★"
      : "—";
    setEncSummary({ count: items.length, pctSobrecobro: pct, topExpectativa: top || "—", avgStars });
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial async desde Supabase
    fetchEncSummary();
  }, []);

  async function handleEncSubmit() {
    setEncError(null);
    if (!encSobrecobro) {
      document.getElementById("encSobrecobro")?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase) {
      setEncError(
        "No se pudo conectar con la base de datos (Supabase no está configurado en este entorno)."
      );
      return;
    }
    setEncSubmitting(true);
    const sobrecobroValue: EncuestaInsert["sobrecobro"] =
      encSobrecobro === "inseguro" ? "no_seguro" : encSobrecobro;
    const payload: EncuestaInsert = {
      sobrecobro: sobrecobroValue,
      sobrecobro_detalle: encDetalle.trim() || null,
      expectativas: encExpectativas,
      usabilidad_estrellas: encStars > 0 ? encStars : null,
      comentario: encComentario.trim() || null,
    };
    const { error } = await supabase.from("encuestas").insert(payload);
    setEncSubmitting(false);
    if (error) {
      setEncError("No se pudo enviar tu respuesta. Intenta de nuevo en unos minutos.");
      return;
    }
    setEncSobrecobro(null);
    setEncExpectativas([]);
    setEncStars(0);
    setEncDetalle("");
    setEncComentario("");
    setEncConfirm(true);
    window.setTimeout(() => setEncConfirm(false), 4500);
    fetchEncSummary();
  }

  const encDetalleHidden = encSobrecobro === null || encSobrecobro === "no";

  return (
    <div className="wrap">
      <div className="masthead">
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
          <p>Verifica tarifas de transporte y precios de referencia antes de pagar en Cartagena</p>
        </div>
      </div>

      {/* ABOUT / CONTEXT COLUMN */}
      <div className="about">
        <div className="card">
          <span className="badge-academic">Prototipo académico</span>
          <h2 style={{ marginTop: 10 }}>Sobre este prototipo</h2>
          <p>
            Este es un prototipo funcional construido a partir de la revisión documental &quot;Control y
            transparencia de precios en el sector turístico de Cartagena de Indias&quot; (Universidad de
            Cartagena, CTeV). No es una aplicación oficial del Distrito.
          </p>
          <p>
            Los rangos de precios provienen de tarifas oficiales publicadas y listas de precios distritales;
            los casos mostrados son ejemplos reales reportados por medios de comunicación entre 2023 y 2025.
          </p>
          <p>
            La pestaña <strong>Mapa</strong> muestra, a modo conceptual, cómo se vería agregar
            recomendaciones, cartas e historial de calificaciones por comercio. Usa datos de muestra: extraer
            esa información en vivo de plataformas como Google Maps o TripAdvisor implica riesgos legales
            analizados en la sección 6.6 del artículo, por lo que la ruta recomendada es la Places API de
            Google más alianzas directas con los negocios.
          </p>
          <p>
            Las pestañas <strong>Actores</strong> y <strong>Encuesta</strong> implementan la metodología
            propuesta para el proyecto: el levantamiento y caracterización de los actores del sector
            turístico, y un instrumento de encuesta para identificar el principal dolor del turista y
            validar este prototipo con actores locales.
          </p>
          <div className="stat-row">
            <div className="stat">
              <span className="n">289</span>
              <span className="l">reportes de sobrecobro ene-jul 2025</span>
            </div>
            <div className="stat">
              <span className="n">4</span>
              <span className="l">categorías de actores identificadas</span>
            </div>
          </div>
        </div>
        <div className="card">
          <h2>Fuentes principales</h2>
          <ul className="src-list">
            <li>Alcaldía Mayor de Cartagena — Decreto 0051 de 2026 (tarifas de taxi)</li>
            <li>Asociación Cartagenera de Cocheros — tarifas de coches tradicionales</li>
            <li>La FM (2025) — lista oficial de precios, playas de La Boquilla</li>
            <li>El Tiempo (s.f.) — lista de precios de la playa de Cholón</li>
            <li>El Universal e Infobae (2023-2025) — casos de sobrecobro reportados</li>
          </ul>
        </div>
      </div>

      {/* APP SHELL */}
      <div className="appshell">
        <div className="appbar">
          <div className="row">
            <div>
              <h2>{copy.title}</h2>
              <div className="sub">{copy.sub}</div>
            </div>
            <button
              className="theme-toggle"
              type="button"
              onClick={() => setThemeIdx((i) => (i + 1) % THEME_ORDER.length)}
            >
              {THEME_LABELS[theme]}
            </button>
          </div>
        </div>

        <div className="tabs" role="tablist" aria-label="Secciones de la app">
          <button
            className="tab"
            role="tab"
            aria-selected={cat === "transporte" ? "true" : "false"}
            onClick={() => handleTabClick("transporte")}
            type="button"
          >
            Transporte
          </button>
          <button
            className="tab"
            role="tab"
            aria-selected={cat === "playa" ? "true" : "false"}
            onClick={() => handleTabClick("playa")}
            type="button"
          >
            Playas
          </button>
          <button
            className="tab"
            role="tab"
            aria-selected={cat === "mapa" ? "true" : "false"}
            onClick={() => handleTabClick("mapa")}
            type="button"
          >
            Mapa
          </button>
          <button
            className="tab"
            role="tab"
            aria-selected={cat === "actores" ? "true" : "false"}
            onClick={() => handleTabClick("actores")}
            type="button"
          >
            Actores
          </button>
          <button
            className="tab"
            role="tab"
            aria-selected={cat === "encuesta" ? "true" : "false"}
            onClick={() => handleTabClick("encuesta")}
            type="button"
          >
            Encuesta
          </button>
        </div>

        <div className="panel">
          {(cat === "transporte" || cat === "playa") && (
            <div id="tarifasView">
              <div className="chiprow" id="zoneRow" aria-label="Filtrar por zona">
                {ZONES_BY_CAT[tarifasCat].map((z) => (
                  <button
                    key={z}
                    className="chip"
                    type="button"
                    aria-pressed={z === zone ? "true" : "false"}
                    onClick={() => setZone(z)}
                  >
                    {z}
                  </button>
                ))}
              </div>

              <div className="service-list" id="serviceList">
                {items.map((s) => {
                  const rangeTxt = s.min === s.max ? money(s.min) : `${money(s.min)}–${money(s.max)}`;
                  return (
                    <button
                      key={s.id}
                      className="service"
                      type="button"
                      aria-pressed={selected === s.id ? "true" : "false"}
                      onClick={() => handleSelectService(s.id)}
                    >
                      <span>
                        <span className="name">{s.name}</span>
                        <br />
                        <span className="zone">{s.zone}</span>
                      </span>
                      <span className="range mono">{rangeTxt}</span>
                    </button>
                  );
                })}
              </div>

              <div className="detail" id="detail" hidden={!selectedService}>
                {selectedService && (
                  <>
                    <div className="title">
                      <div>
                        <h3 id="dName">{selectedService.name}</h3>
                        <div className="zone" id="dZone">
                          {selectedService.zone}
                        </div>
                      </div>
                    </div>
                    <div className="price-block">
                      <span className="big mono" id="dRange">
                        {selectedService.min === selectedService.max
                          ? money(selectedService.min)
                          : `${money(selectedService.min)} – ${money(selectedService.max)}`}
                      </span>
                      <span className="unit" id="dUnit">
                        {selectedService.unit}
                      </span>
                    </div>
                    <div className="reg" id="dReg">
                      Fuente: {selectedService.reg}
                    </div>

                    <label
                      htmlFor="paidInput"
                      style={{ fontSize: ".82rem", fontWeight: 600, display: "block", marginBottom: 6 }}
                    >
                      ¿Cuánto te cobraron?
                    </label>
                    <div className="check-row">
                      <input
                        id="paidInput"
                        inputMode="numeric"
                        placeholder="Ej: 250000"
                        aria-label="Valor cobrado en pesos colombianos"
                        value={paid}
                        onChange={(e) => setPaid(e.target.value)}
                      />
                      <button className="btn" type="button" onClick={handleCheck}>
                        Verificar
                      </button>
                    </div>

                    <div className={`verdict good${verdict?.type === "good" ? " show" : ""}`} role="status">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" fill="var(--good)" />
                        <path
                          d="M7.5 12.5 10.5 15.5 16.5 9"
                          stroke="var(--good-bg)"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <div>
                        <div className="vtitle">Dentro del rango de referencia</div>
                        <p id="goodMsg">
                          {verdict?.type === "good"
                            ? verdict.message
                            : "El valor cobrado corresponde a la tarifa esperada para este servicio y zona."}
                        </p>
                      </div>
                    </div>

                    <div className={`verdict warn${verdict?.type === "warn" ? " show" : ""}`} role="status">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M12 3 22 20H2L12 3Z" fill="var(--warn)" />
                        <path d="M12 9.5v4.2" stroke="var(--warn-bg)" strokeWidth="2" strokeLinecap="round" />
                        <circle cx="12" cy="16.6" r="1.1" fill="var(--warn-bg)" />
                      </svg>
                      <div style={{ flex: 1 }}>
                        <div className="vtitle" id="warnTitle">
                          Posible sobrecobro
                        </div>
                        <p id="warnMsg">
                          {verdict?.type === "warn"
                            ? verdict.message
                            : "El valor supera el máximo de referencia para este servicio."}
                        </p>
                        <div className="actions">
                          <a
                            className="btn accent"
                            id="waLink"
                            href="https://wa.me/573042511127"
                            target="_blank"
                            rel="noopener"
                          >
                            Reportar por Titán Chat
                          </a>
                          <button
                            className="btn ghost"
                            type="button"
                            onClick={() => setProtocolOpen((v) => !v)}
                          >
                            Ver protocolo
                          </button>
                        </div>
                        <div className={`protocol${protocolOpen ? " show" : ""}`} id="protocol">
                          Así se atiende un reporte, según la revisión documental (Figura 3):
                          <ol>
                            <li>
                              Recepción del reporte por Titán Chat, Policía de Turismo o Secretaría de
                              Turismo.
                            </li>
                            <li>Verificación en el sitio y revisión de la lista oficial de precios.</li>
                            <li>Mediación entre el turista y el prestador del servicio.</li>
                            <li>Reembolso o ajuste, o remisión a inspección / SIC si no hay acuerdo.</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="section-title">
                <h3>Casos reportados de referencia</h3>
                <span>2023–2025</span>
              </div>
              <div id="caseList">
                {CASES.map((c, i) => (
                  <div className="case" key={i}>
                    <div className="top">
                      <span className="place">{c.place}</span>
                      <span className="date">{c.date}</span>
                    </div>
                    <div>{c.item}</div>
                    <div className="amounts">
                      <span className="over">{c.charged}</span> · <span className="ref">{c.ref}</span>
                    </div>
                    <div className="src">{c.src}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {cat === "mapa" && (
            <div id="mapaView">
              <div className="map-disclaimer">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 3 22 20H2L12 3Z" fill="var(--accent)" />
                  <path d="M12 9.5v4.2" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="12" cy="16.6" r="1.1" fill="#fff" />
                </svg>
                <p>
                  Vista conceptual con <strong>datos de muestra</strong>. No se extrajo información real de
                  Google Maps, TripAdvisor ni otras plataformas — ver la sección 6.6 del artículo sobre la
                  legalidad de usar datos de terceros. Las cartas de La Boquilla y Cholón sí provienen de las
                  listas oficiales de precios ya citadas en la app.
                </p>
              </div>

              <div className="map-wrap" id="mapWrap" aria-label="Mapa esquemático de zonas turísticas de Cartagena">
                <svg className="map-bg" viewBox="0 0 100 136" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                  <defs>
                    <linearGradient id="pcSea" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="var(--map-sea-1)" />
                      <stop offset="100%" stopColor="var(--map-sea-2)" />
                    </linearGradient>
                    <linearGradient id="pcBay" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="var(--map-bay-1)" />
                      <stop offset="100%" stopColor="var(--map-bay-2)" />
                    </linearGradient>
                    <pattern id="pcLand" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                      <rect width="3" height="3" fill="var(--map-land)" />
                      <line x1="0" y1="0" x2="0" y2="3" stroke="var(--map-land-line)" strokeWidth="0.35" />
                    </pattern>
                    <pattern id="pcGrid" width="3.2" height="3.2" patternUnits="userSpaceOnUse">
                      <path d="M3.2,0 L0,0 0,3.2" fill="none" stroke="var(--map-grid)" strokeWidth="0.25" />
                    </pattern>
                  </defs>

                  <rect x="0" y="0" width="100" height="136" fill="url(#pcSea)" />

                  <path
                    d="M 100,0 L 100,136 L 84,136
                       C 80,124 84,114 80,104 C 76,94 82,86 78,76
                       C 74,66 78,54 72,46 C 66,38 70,28 64,20
                       C 60,14 62,6 58,0 Z"
                    fill="url(#pcLand)"
                    stroke="var(--map-land-stroke)"
                    strokeWidth="0.7"
                    strokeLinejoin="round"
                  />

                  <path
                    d="M 58,0 C 62,6 60,14 64,20 C 70,28 66,38 72,46
                       C 78,54 74,66 78,76 C 82,86 76,94 80,104
                       C 78,106 74,104 70,98 C 66,90 68,82 64,74
                       C 60,66 64,56 58,48 C 52,40 56,30 52,22
                       C 50,16 52,10 56,4 C 57,2 57.5,1 58,0 Z"
                    fill="url(#pcBay)"
                    opacity="0.95"
                  />

                  <path
                    d="M 56,4 C 47,8 41,14 43,24 C 45,34 39,42 41,52
                       C 43,60 45,66 49,74 C 51,80 55,78 57,72
                       C 61,64 59,54 61,44 C 63,36 59,28 61,20
                       C 63,12 61,6 56,4 Z"
                    fill="url(#pcLand)"
                    stroke="var(--map-land-stroke)"
                    strokeWidth="0.7"
                    strokeLinejoin="round"
                  />
                  <path d="M 50,6 C 46,9 43,13 43.5,18 L 55,18 C 55.5,13 57,9 56,4 Z" fill="url(#pcGrid)" opacity="0.8" />

                  <path
                    d="M 34,84 C 42,81 50,85 51,93 C 52,101 45,107 36,106
                       C 27,105 24,96 28,89 C 30,86 32,85 34,84 Z"
                    fill="url(#pcLand)"
                    stroke="var(--map-land-stroke)"
                    strokeWidth="0.6"
                  />

                  <path
                    d="M 40,108 C 48,106 54,112 52,120 C 50,129 40,135 28,133
                       C 17,131 12,123 17,116 C 22,109 32,109 40,108 Z"
                    fill="url(#pcLand)"
                    stroke="var(--map-land-stroke)"
                    strokeWidth="0.6"
                  />

                  <g transform="translate(90,10)">
                    <circle r="6.5" fill="var(--map-compass-bg)" stroke="var(--map-land-stroke)" strokeWidth="0.4" />
                    <path d="M0,-4.5 L1.5,0 L0,4.5 L-1.5,0 Z" fill="var(--map-compass-fg)" />
                    <text x="0" y="-7" fontSize="3.4" textAnchor="middle" fill="var(--map-compass-fg)" fontWeight="700">
                      N
                    </text>
                  </g>

                  <g transform="translate(6,128)" stroke="var(--map-scale)" fill="var(--map-scale)">
                    <line x1="0" y1="0" x2="10" y2="0" strokeWidth="0.6" />
                    <line x1="0" y1="-1" x2="0" y2="1" strokeWidth="0.6" />
                    <line x1="10" y1="-1" x2="10" y2="1" strokeWidth="0.6" />
                    <text x="0" y="4.5" fontSize="2.6" fontFamily="'IBM Plex Mono',monospace">
                      0
                    </text>
                    <text x="6.4" y="4.5" fontSize="2.6" fontFamily="'IBM Plex Mono',monospace">
                      2 km
                    </text>
                  </g>

                  <text x="8" y="12" fontSize="4.4" fill="var(--map-label-sea)" fontStyle="italic" fontFamily="Georgia,serif">
                    Mar Caribe
                  </text>
                  <text x="63" y="54" fontSize="3.5" fill="var(--map-label-bay)" fontStyle="italic" fontFamily="Georgia,serif">
                    <tspan x="63" dy="0">
                      Bahía de
                    </tspan>
                    <tspan x="63" dy="4.1">
                      Cartagena
                    </tspan>
                  </text>
                </svg>
                <div className="pin-layer" id="pinLayer">
                  {ZONES_MAP.map((z) => (
                    <button
                      key={z.id}
                      className="pin"
                      type="button"
                      style={{ left: `${z.x}%`, top: `${z.y}%` }}
                      aria-pressed={mapZone === z.id ? "true" : "false"}
                      aria-label={`Ver comercios de ejemplo en ${z.name}`}
                      onClick={() => setMapZone(z.id)}
                    >
                      <span className="dot">
                        <svg viewBox="0 0 24 24" fill="none">
                          <path d="M12 21s7-7.2 7-12A7 7 0 1 0 5 9c0 4.8 7 12 7 12Z" fill="#fff" />
                        </svg>
                      </span>
                      <span className="lbl">{z.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div id="zoneDetail" className="zone-detail" hidden={!selectedMapZone}>
                {selectedMapZone && (
                  <>
                    <h3>{selectedMapZone.name}</h3>
                    <div className="ztag">{selectedMapZone.places.length} comercio(s) de ejemplo en esta zona</div>
                    {selectedMapZone.places.map((p, i) => (
                      <div className="place-card" key={i}>
                        <div className="pname">{p.name}</div>
                        <div className="ptype">{p.type}</div>
                        <div className="carta-title">
                          {p.official ? "Carta (lista oficial de precios)" : "Carta de ejemplo"}
                        </div>
                        <ul className="carta-list">
                          {p.carta.map((c, j) => (
                            <li key={j}>
                              <span>{c.item}</span>
                              <span className="cprice mono">{money(c.price)}</span>
                            </li>
                          ))}
                        </ul>
                        {!p.official && (
                          <div className="carta-note">Precios ilustrativos, no verificados con el negocio.</div>
                        )}
                        <div className="rate-title">Historial de calificaciones por plataforma</div>
                        <div className="rate-list">
                          {p.ratings.map((r, k) => {
                            const pct = Math.round((r.stars / 5) * 100);
                            return (
                              <div className="rate-row" key={k}>
                                <span className="rsrc">{r.source}</span>
                                <span className="rstars mono">{starsLabel(r.stars)}</span>
                                <span className="rate-bar">
                                  <span style={{ width: `${pct}%` }} />
                                </span>
                                <span className="rcount">{r.count}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}

          {cat === "actores" && (
            <div id="actoresView">
              <p className="intro-note">
                Antes de definir los requerimientos de Precio Claro, el equipo hizo un{" "}
                <strong>levantamiento de los actores del sector turístico</strong> de Cartagena y caracterizó
                a los prestadores de servicios: qué ofrecen, a qué precio, y qué oportunidad ven en una
                herramienta como esta (fases 1 y 2 de la metodología propuesta).
              </p>
              <div id="actorList">
                {ACTORS.map((a, i) => (
                  <div className="actor-card" key={i}>
                    <span className="atag">{a.tag}</span>
                    <div className="atitle">{a.name}</div>
                    <dl>
                      <div>
                        <dt>Qué hace / ofrece</dt>
                        <dd>{a.ofrece}</dd>
                      </div>
                      <div>
                        <dt>Rango de precio típico</dt>
                        <dd>{a.precio}</dd>
                      </div>
                      <div>
                        <dt>Dolor o deficiencia identificada</dt>
                        <dd>{a.dolor}</dd>
                      </div>
                      <div>
                        <dt>Oportunidad para Precio Claro</dt>
                        <dd>{a.oportunidad}</dd>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>

              <div className="form-card">
                <h4>Caracteriza tu negocio</h4>
                <p className="fnote">
                  Si prestas un servicio turístico en Cartagena, cuéntanos sobre tu negocio. Esto alimenta el
                  levantamiento de actores del proyecto.
                </p>
                <div className="field">
                  <label className="field-label" htmlFor="presNombre">
                    Nombre del negocio
                  </label>
                  <input
                    className="text-input"
                    id="presNombre"
                    type="text"
                    placeholder="Ej: Kiosko Brisas del Mar"
                    maxLength={80}
                    value={presNombre}
                    onChange={(e) => setPresNombre(e.target.value)}
                  />
                </div>
                <div className="field">
                  <span className="field-label">Tipo de servicio</span>
                  <div className="chiprow" id="presTipo" aria-label="Tipo de servicio">
                    {PRESTADOR_TIPOS.map((t) => (
                      <button
                        key={t.value}
                        className="chip"
                        type="button"
                        aria-pressed={presTipo === t.value ? "true" : "false"}
                        onClick={() => setPresTipo(t.value)}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="presZona">
                    Zona
                  </label>
                  <input
                    className="text-input"
                    id="presZona"
                    type="text"
                    placeholder="Ej: La Boquilla, Bocagrande, Centro Histórico..."
                    maxLength={60}
                    value={presZona}
                    onChange={(e) => setPresZona(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="presOferta">
                    ¿Qué ofreces y a qué precio aproximado?
                  </label>
                  <textarea
                    className="textarea"
                    id="presOferta"
                    placeholder="Ej: Almuerzos de pescado desde $35.000, alquiler de carpa $20.000 por día..."
                    value={presOferta}
                    onChange={(e) => setPresOferta(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="presOportunidad">
                    ¿Qué oportunidad ves en una app como Precio Claro?
                  </label>
                  <textarea
                    className="textarea"
                    id="presOportunidad"
                    placeholder="Ej: Que los turistas vean mi carta real antes de sentarse a comer..."
                    value={presOportunidad}
                    onChange={(e) => setPresOportunidad(e.target.value)}
                  />
                </div>
                <button
                  className="btn block"
                  type="button"
                  onClick={handlePresSubmit}
                  disabled={presSubmitting}
                >
                  {presSubmitting ? "Guardando…" : "Guardar caracterización"}
                </button>
                {presError && <p className="error-note">{presError}</p>}
                <div className={`confirm-card${presConfirm ? " show" : ""}`} role="status">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" fill="var(--good)" />
                    <path
                      d="M7.5 12.5 10.5 15.5 16.5 9"
                      stroke="var(--good-bg)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div>
                    <div className="vtitle">Caracterización guardada</div>
                    <p>Gracias — esta información ayuda al equipo a entender la oferta turística de tu zona.</p>
                  </div>
                </div>
                <div className="mini-list" id="presList">
                  {presList.map((p) => {
                    const tipoLabel = tipoLabelFor(p.tipo_servicio);
                    return (
                      <div className="mini-item" key={p.id}>
                        <div className="mname">
                          {p.nombre_negocio}
                          {tipoLabel ? ` · ${tipoLabel}` : ""}
                        </div>
                        <div className="mmeta">
                          {p.zona || "Zona no indicada"}
                          {p.oferta_precio ? ` — ${p.oferta_precio}` : ""}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="local-note">
                  Este formulario demuestra cómo se recolecta la caracterización de prestadores; las
                  respuestas se guardan en la base de datos compartida del proyecto. En campo, el equipo
                  aplicó esta misma ficha directamente a los prestadores y la consolidó en la matriz de
                  actores del proyecto.
                </p>
              </div>
            </div>
          )}

          {cat === "encuesta" && (
            <div id="encuestaView">
              <p className="intro-note">
                Para identificar el <strong>principal dolor</strong> del turista y validar este prototipo
                con actores locales, el equipo usa una encuesta corta como instrumento de recolección de
                datos y una pregunta de usabilidad (fase 3 de la metodología y prueba de validación).
              </p>

              <div className="field">
                <span className="field-label">¿Alguna vez sentiste que te cobraron de más en Cartagena?</span>
                <div className="chiprow" id="encSobrecobro" aria-label="¿Sentiste sobrecobro?">
                  {SOBRECOBRO_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      className="chip"
                      type="button"
                      aria-pressed={encSobrecobro === opt.value ? "true" : "false"}
                      onClick={() => setEncSobrecobro(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field" id="encDetalleWrap" hidden={encDetalleHidden}>
                <label className="field-label" htmlFor="encDetalle">
                  Cuéntanos qué pasó (opcional)
                </label>
                <textarea
                  className="textarea"
                  id="encDetalle"
                  placeholder="Ej: Me cobraron el doble por un coche de caballos en el Centro Histórico..."
                  value={encDetalle}
                  onChange={(e) => setEncDetalle(e.target.value)}
                />
              </div>

              <div className="field">
                <span className="field-label">
                  ¿Qué esperarías que Precio Claro te ayude a hacer? (elige todas las que apliquen)
                </span>
                <div className="chiprow" id="encExpectativas" aria-label="Expectativas sobre la app">
                  {EXPECTATIVAS.map((e) => (
                    <button
                      key={e}
                      className="chip"
                      type="button"
                      aria-pressed={encExpectativas.includes(e) ? "true" : "false"}
                      onClick={() =>
                        setEncExpectativas((prev) =>
                          prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]
                        )
                      }
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <span className="field-label">¿Qué tan fácil te pareció usar este prototipo?</span>
                <div>
                  <span className="star-picker" id="encStars" role="radiogroup" aria-label="Facilidad de uso, de 1 a 5 estrellas">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <button
                        key={i}
                        type="button"
                        className={i <= encStars ? "on" : ""}
                        role="radio"
                        aria-checked={i === encStars ? "true" : "false"}
                        aria-label={`${i} de 5`}
                        onClick={() => setEncStars(i)}
                      >
                        ★
                      </button>
                    ))}
                  </span>
                  <span className="star-picker-label" id="encStarsLabel">
                    {STAR_LABELS[encStars]}
                  </span>
                </div>
              </div>

              <div className="field">
                <label className="field-label" htmlFor="encComentario">
                  Comentario libre (opcional)
                </label>
                <textarea
                  className="textarea"
                  id="encComentario"
                  placeholder="¿Algo más que quieras contarnos?"
                  value={encComentario}
                  onChange={(e) => setEncComentario(e.target.value)}
                />
              </div>

              <button className="btn block" type="button" onClick={handleEncSubmit} disabled={encSubmitting}>
                {encSubmitting ? "Enviando…" : "Enviar respuesta"}
              </button>
              {encError && <p className="error-note">{encError}</p>}
              <div className={`confirm-card${encConfirm ? " show" : ""}`} role="status">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" fill="var(--good)" />
                  <path
                    d="M7.5 12.5 10.5 15.5 16.5 9"
                    stroke="var(--good-bg)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div>
                  <div className="vtitle">¡Gracias por tu respuesta!</div>
                  <p>Tu respuesta ayuda al equipo a identificar el principal dolor de los turistas y a validar el prototipo.</p>
                </div>
              </div>

              <div className="section-title">
                <h3>Resumen del equipo</h3>
                <span id="encCount">
                  {encSummary.count} {encSummary.count === 1 ? "respuesta" : "respuestas"}
                </span>
              </div>
              <div className="summary-grid">
                <div className="summary-tile">
                  <span className="sn" id="encPctSobrecobro">
                    {encSummary.pctSobrecobro}
                  </span>
                  <span className="sl">dijeron que sí sintieron sobrecobro</span>
                </div>
                <div className="summary-tile">
                  <span className="sn" id="encTopExpectativa">
                    {encSummary.topExpectativa}
                  </span>
                  <span className="sl">expectativa más elegida</span>
                </div>
                <div className="summary-tile">
                  <span className="sn" id="encAvgStars">
                    {encSummary.avgStars}
                  </span>
                  <span className="sl">facilidad de uso promedio</span>
                </div>
              </div>
              <p className="local-note">
                Este resumen agrega en tiempo real las respuestas guardadas en la base de datos compartida
                del proyecto (Supabase), respondidas por todo el equipo o el público desde este enlace, como
                se describe en la metodología del artículo.
              </p>
            </div>
          )}
        </div>
      </div>

      <footer className="note">
        Precio Claro — prototipo elaborado para el artículo de revisión sobre control y transparencia de
        precios turísticos en Cartagena. Los valores son de referencia y pueden variar; consulte siempre al
        prestador la lista oficial de precios.
      </footer>
    </div>
  );
}
