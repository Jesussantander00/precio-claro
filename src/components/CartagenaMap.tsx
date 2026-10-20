"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { money, type MapZone } from "@/lib/data";

export type MapKind = "todas" | MapZone["kind"];

type Props = {
  /** Zonas visibles según el filtro activo. */
  zones: MapZone[];
  /** Cantidad de zonas por categoría (para los chips de filtro). */
  counts: Record<MapKind, number>;
  filter: MapKind;
  onFilter: (k: MapKind) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Baja a la sección con la carta completa y las calificaciones. */
  onOpenDetail: () => void;
};

// Capas base. "Mapa" y "Claro" son vectoriales de OpenFreeMap (datos © OpenStreetMap); el resto son
// mosaicos de imágenes de Esri. Todas son gratuitas y no necesitan clave de API.
const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services";
const esri = (path: string) => `${ESRI}/${path}/MapServer/tile/{z}/{y}/{x}`;

type BaseKey = "mapa" | "claro" | "satelite" | "hibrido" | "relieve";
type RasterLayer = { tiles: string; maxzoom: number; attribution?: string };

const ATTR_IMG = "Imágenes © Esri, Maxar, Earthstar Geographics";
const ATTR_TOPO = "Relieve © Esri, USGS, NOAA";

const BASES: Record<BaseKey, { label: string; hint: string; vector: boolean; style?: string; raster?: RasterLayer[] }> = {
  mapa: { label: "Mapa", hint: "Calles y nombres", vector: true, style: "https://tiles.openfreemap.org/styles/liberty" },
  claro: { label: "Claro", hint: "Minimalista", vector: true, style: "https://tiles.openfreemap.org/styles/positron" },
  satelite: {
    label: "Satélite",
    hint: "Fotos aéreas",
    vector: false,
    raster: [{ tiles: esri("World_Imagery"), maxzoom: 19, attribution: ATTR_IMG }],
  },
  hibrido: {
    label: "Híbrido",
    hint: "Satélite con calles y nombres",
    vector: false,
    raster: [
      { tiles: esri("World_Imagery"), maxzoom: 19, attribution: ATTR_IMG },
      { tiles: esri("Reference/World_Transportation"), maxzoom: 19 },
      { tiles: esri("Reference/World_Boundaries_and_Places"), maxzoom: 19 },
    ],
  },
  relieve: {
    label: "Relieve",
    hint: "Terreno y curvas de nivel",
    vector: false,
    raster: [{ tiles: esri("World_Topo_Map"), maxzoom: 19, attribution: ATTR_TOPO }],
  },
};
const BASE_ORDER: BaseKey[] = ["mapa", "claro", "satelite", "hibrido", "relieve"];
const STORE_KEY = "pc-map-base";

// Para capas de imágenes se arma un estilo de MapLibre solo con mosaicos raster.
function styleFor(key: BaseKey): string | maplibregl.StyleSpecification {
  const b = BASES[key];
  if (b.style) return b.style;
  const layers = b.raster ?? [];
  return {
    version: 8,
    sources: Object.fromEntries(
      layers.map((l, i) => [`r${i}`, { type: "raster", tiles: [l.tiles], tileSize: 256, maxzoom: l.maxzoom, attribution: l.attribution }])
    ),
    layers: layers.map((_, i) => ({ id: `r${i}`, type: "raster", source: `r${i}` })),
  } as maplibregl.StyleSpecification;
}

function readStoredBase(): BaseKey {
  try {
    const v = window.localStorage.getItem(STORE_KEY);
    if (v && v in BASES) return v as BaseKey;
  } catch {
    /* sin almacenamiento: se usa la capa por defecto */
  }
  return "mapa";
}

const KIND_LABEL: Record<MapKind, string> = { todas: "Todas", ciudad: "Ciudad", playa: "Playas" };

// Iconos simples (trazos) para cada categoría.
const ICON_CITY =
  '<path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
const ICON_BEACH =
  '<path d="M3 17c2.2 0 2.2-1.6 4.5-1.6S9.8 17 12 17s2.2-1.6 4.5-1.6S18.8 17 21 17M3 21c2.2 0 2.2-1.6 4.5-1.6S9.8 21 12 21s2.2-1.6 4.5-1.6S18.8 21 21 21M12 13V4m0 0C8 4 5.5 6.5 5 10h14c-.5-3.5-3-6-7-6Z" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';

function esc(t: string) {
  return t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

// Elemento HTML del marcador: círculo con icono + etiqueta con el nombre de la zona.
function pinElement(z: MapZone, labelOnTop: boolean) {
  const el = document.createElement("div");
  el.className = "pc-pin-wrap";
  el.setAttribute("role", "button");
  el.tabIndex = 0;
  el.title = z.name;
  el.setAttribute("aria-label", `Zona ${z.name}`);
  el.innerHTML =
    `<span class="pc-pin ${z.kind}"><svg viewBox="0 0 24 24" aria-hidden="true">${z.kind === "playa" ? ICON_BEACH : ICON_CITY}</svg></span>` +
    `<span class="pc-lbl ${labelOnTop ? "top" : "bottom"}">${esc(z.name)}</span>`;
  return el;
}

function km(a: [number, number], b: [number, number]) {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function readDark() {
  const t = document.documentElement.dataset.theme;
  if (t === "dark") return true;
  if (t === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export default function CartagenaMap({ zones, counts, filter, onFilter, selectedId, onSelect, onOpenDetail }: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, { marker: maplibregl.Marker; el: HTMLElement }>>(new Map());
  const meRef = useRef<maplibregl.Marker | null>(null);
  const onSelectRef = useRef(onSelect);
  const zonesRef = useRef(zones);
  const [dark, setDark] = useState(false);
  const [base, setBase] = useState<BaseKey>(readStoredBase);
  const [layersOpen, setLayersOpen] = useState(false);
  const appliedBase = useRef<BaseKey>(base);
  const layersRef = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [locMsg, setLocMsg] = useState<string | null>(null);
  const [locBusy, setLocBusy] = useState(false);

  useEffect(() => {
    onSelectRef.current = onSelect;
    zonesRef.current = zones;
  }, [onSelect, zones]);

  // Tema: sigue el selector de la app (data-theme) o la preferencia del sistema.
  useEffect(() => {
    const update = () => setDark(readDark());
    update();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", update);
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      mq.removeEventListener("change", update);
      obs.disconnect();
    };
  }, []);

  // Crear el mapa una sola vez.
  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: elRef.current,
        style: styleFor(appliedBase.current),
        center: [-75.55, 10.37],
        zoom: 10,
        minZoom: 8,
        maxZoom: 18,
        attributionControl: { compact: true },
        // En el celular se mueve con dos dedos y en el computador se hace zoom con Ctrl + rueda,
        // para no bloquear el scroll de la página.
        cooperativeGestures: true,
        locale: {
          "CooperativeGesturesHandler.WindowsHelpText": "Usa Ctrl + rueda para hacer zoom en el mapa",
          "CooperativeGesturesHandler.MacHelpText": "Usa ⌘ + rueda para hacer zoom en el mapa",
          "CooperativeGesturesHandler.MobileHelpText": "Usa dos dedos para mover el mapa",
        },
      });
    } catch {
      // Sin WebGL (equipos muy antiguos o con aceleración de gráficos desactivada).
      queueMicrotask(() => setFailed(true));
      return;
    }
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    const syncZoom = () => {
      elRef.current?.classList.toggle("zoom-low", map.getZoom() < 11.5);
    };
    map.on("zoom", syncZoom);
    map.on("load", () => {
      syncZoom();
      setReady(true);
    });
    map.on("click", () => onSelectRef.current(null));
    mapRef.current = map;
    const markers = markersRef.current;
    return () => {
      markers.forEach(({ marker }) => marker.remove());
      markers.clear();
      meRef.current?.remove();
      meRef.current = null;
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, []);

  // Cambiar de capa base (los marcadores son HTML y no se pierden).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || appliedBase.current === base) return;
    appliedBase.current = base;
    map.setStyle(styleFor(base));
    try {
      window.localStorage.setItem(STORE_KEY, base);
    } catch {
      /* ignorar */
    }
  }, [base]);

  // Cerrar el selector de capas al tocar fuera o con Esc.
  useEffect(() => {
    if (!layersOpen) return;
    const onDown = (e: Event) => {
      if (layersRef.current && !layersRef.current.contains(e.target as Node)) setLayersOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLayersOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [layersOpen]);

  // Dibujar marcadores solo cuando cambian las zonas visibles.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach(({ marker }) => marker.remove());
    markersRef.current.clear();
    zones.forEach((z) => {
      // Si hay otra zona muy cerca, la del norte pone su etiqueta arriba y la del sur abajo (sin solaparse).
      const labelOnTop = zones.some(
        (o) => o.id !== z.id && Math.abs(o.lat - z.lat) < 0.06 && Math.abs(o.lng - z.lng) < 0.06 && o.lat < z.lat
      );
      const el = pinElement(z, labelOnTop);
      const choose = (e: Event) => {
        e.stopPropagation();
        onSelectRef.current(z.id);
      };
      el.addEventListener("click", choose);
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          choose(e);
        }
      });
      const marker = new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat([z.lng, z.lat]).addTo(map);
      markersRef.current.set(z.id, { marker, el });
    });
    if (zones.length) {
      const b = new maplibregl.LngLatBounds();
      zones.forEach((z) => b.extend([z.lng, z.lat]));
      map.fitBounds(b, { padding: { top: 76, bottom: 64, left: 56, right: 56 }, maxZoom: 13, duration: 600 });
    }
  }, [zones, ready]);

  // Resaltar el marcador seleccionado sin recrearlo.
  useEffect(() => {
    markersRef.current.forEach(({ el }, id) => {
      el.firstElementChild?.classList.toggle("sel", id === selectedId);
      el.classList.toggle("is-sel", id === selectedId);
    });
  }, [zones, selectedId, ready]);

  // Centrar el mapa en la zona seleccionada (dejando espacio para la tarjeta).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const z = zonesRef.current.find((x) => x.id === selectedId);
    if (!z) return;
    const h = map.getContainer().clientHeight;
    map.flyTo({ center: [z.lng, z.lat], zoom: Math.max(map.getZoom(), 13), offset: [0, -h * 0.18], duration: 800 });
  }, [selectedId]);

  // Pantalla completa (CSS fijo: funciona también en iPhone) + tecla Esc.
  useEffect(() => {
    document.body.style.overflow = full ? "hidden" : "";
    const t = window.setTimeout(() => mapRef.current?.resize(), 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFull(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [full]);

  // Mi ubicación: marca al usuario y selecciona la zona más cercana.
  const locate = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!("geolocation" in navigator)) {
      setLocMsg("Tu navegador no permite obtener la ubicación.");
      return;
    }
    setLocBusy(true);
    setLocMsg(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocBusy(false);
        const here: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        meRef.current?.remove();
        const dot = document.createElement("span");
        dot.className = "pc-me";
        meRef.current = new maplibregl.Marker({ element: dot, anchor: "center" }).setLngLat([here[1], here[0]]).addTo(map);
        const list = zonesRef.current;
        if (!list.length) return;
        const nearest = list.map((z) => ({ z, d: km(here, [z.lat, z.lng]) })).sort((a, b) => a.d - b.d)[0];
        if (nearest.d > 60) {
          setLocMsg(`Estás a ${Math.round(nearest.d)} km de ${nearest.z.name}, la zona más cercana del mapa.`);
          const b = new maplibregl.LngLatBounds([here[1], here[0]], [here[1], here[0]]);
          b.extend([nearest.z.lng, nearest.z.lat]);
          map.fitBounds(b, { padding: 70, duration: 800 });
        } else {
          setLocMsg(`Zona más cercana: ${nearest.z.name} (a ${nearest.d < 1 ? "menos de 1" : nearest.d.toFixed(1)} km).`);
        }
        onSelectRef.current(nearest.z.id);
      },
      (err) => {
        setLocBusy(false);
        setLocMsg(
          err.code === err.PERMISSION_DENIED
            ? "No diste permiso de ubicación. Actívalo en el navegador para usar este botón."
            : "No se pudo obtener tu ubicación. Intenta de nuevo."
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  }, []);

  const sel = selectedId ? zones.find((z) => z.id === selectedId) || null : null;
  const place = sel?.places[0];
  const prices = place ? place.carta.map((c) => c.price) : [];
  const rate = place?.ratings.find((r) => r.source.startsWith("Precio Claro"));

  return (
    <div className={`pc-map${full ? " pc-map--full" : ""}${dark && BASES[base].vector ? " pc-dark" : ""}${BASES[base].vector ? "" : " pc-imagery"}`}>
      <div
        ref={elRef}
        className="pc-host"
        role="application"
        aria-label="Mapa interactivo de zonas turísticas de Cartagena"
      />
      {failed && (
        <div className="pc-fail" role="alert">
          <strong>No se pudo mostrar el mapa.</strong>
          <span>Tu navegador tiene desactivada la aceleración de gráficos (WebGL). Elige una zona de la lista:</span>
          <span className="pc-fail-list">
            {zones.map((z) => (
              <button key={z.id} type="button" className="pc-btn" onClick={() => onSelect(z.id)}>
                {z.name}
              </button>
            ))}
          </span>
        </div>
      )}

      <div className="pc-map-top">
        <div className="pc-seg" role="group" aria-label="Filtrar zonas por categoría">
          {(["todas", "ciudad", "playa"] as MapKind[]).map((k) => (
            <button
              key={k}
              type="button"
              className={`pc-seg-btn${filter === k ? " on" : ""}`}
              aria-pressed={filter === k ? "true" : "false"}
              onClick={() => onFilter(k)}
            >
              {k !== "todas" && <span className={`pc-dot ${k}`} aria-hidden="true" />}
              {KIND_LABEL[k]}
              <span className="pc-count">{counts[k]}</span>
            </button>
          ))}
        </div>
        <div className="pc-tools" ref={layersRef}>
          <button
            type="button"
            className={`pc-tool${layersOpen ? " on" : ""}`}
            onClick={() => setLayersOpen((v) => !v)}
            aria-label="Tipo de mapa"
            aria-expanded={layersOpen ? "true" : "false"}
            title="Tipo de mapa"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3 3 8l9 5 9-5-9-5Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              <path d="m3 12.5 9 5 9-5M3 16.8l9 5 9-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {layersOpen && (
            <div className="pc-layers" role="radiogroup" aria-label="Tipo de mapa">
              {BASE_ORDER.map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={base === k ? "true" : "false"}
                  className={`pc-layer${base === k ? " on" : ""}`}
                  onClick={() => {
                    setBase(k);
                    setLayersOpen(false);
                  }}
                >
                  <span className={`pc-sw ${k}`} aria-hidden="true" />
                  <span className="pc-layer-t">
                    <strong>{BASES[k].label}</strong>
                    <small>{BASES[k].hint}</small>
                  </span>
                </button>
              ))}
            </div>
          )}
          <button type="button" className="pc-tool" onClick={locate} disabled={locBusy} aria-label="Mi ubicación" title="Mi ubicación">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="3.2" fill="currentColor" />
              <circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <button
            type="button"
            className="pc-tool"
            onClick={() => setFull((v) => !v)}
            aria-label={full ? "Salir de pantalla completa" : "Pantalla completa"}
            title={full ? "Salir de pantalla completa" : "Pantalla completa"}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              {full ? (
                <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {locMsg && (
        <div className="pc-toast" role="status">
          <span>{locMsg}</span>
          <button type="button" onClick={() => setLocMsg(null)} aria-label="Cerrar aviso">
            ×
          </button>
        </div>
      )}

      {sel && place && (
        <div className="pc-card" role="dialog" aria-label={`Resumen de ${sel.name}`}>
          <button type="button" className="pc-card-x" onClick={() => onSelect(null)} aria-label="Cerrar tarjeta">
            ×
          </button>
          <span className={`pc-card-kind ${sel.kind}`}>{sel.kind === "playa" ? "Playa" : "Ciudad"}</span>
          <h3>{sel.name}</h3>
          <p className="pc-card-type">{place.type}</p>
          <div className="pc-card-grid">
            <div>
              <span className="pc-k">Carta de referencia</span>
              <span className="pc-v mono">
                {money(Math.min(...prices))} – {money(Math.max(...prices))}
              </span>
            </div>
            <div>
              <span className="pc-k">Precio Claro (turistas)</span>
              <span className="pc-v mono">{rate ? `★ ${rate.stars.toFixed(1)} · ${rate.count}` : "Sin datos"}</span>
            </div>
          </div>
          <div className="pc-card-actions">
            <button type="button" className="pc-btn primary" onClick={onOpenDetail}>
              Ver carta completa
            </button>
            <a
              className="pc-btn"
              href={`https://www.google.com/maps/dir/?api=1&destination=${sel.lat},${sel.lng}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Cómo llegar
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
