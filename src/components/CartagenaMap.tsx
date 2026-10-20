"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
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

// Mosaicos CARTO (basados en datos de OpenStreetMap): claro "Voyager" y oscuro "Dark Matter".
const TILES = {
  light: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
};
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

const KIND_LABEL: Record<MapKind, string> = { todas: "Todas", ciudad: "Ciudad", playa: "Playas" };

// Iconos simples (trazos) para cada categoría.
const ICON_CITY =
  '<path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
const ICON_BEACH =
  '<path d="M3 17c2.2 0 2.2-1.6 4.5-1.6S9.8 17 12 17s2.2-1.6 4.5-1.6S18.8 17 21 17M3 21c2.2 0 2.2-1.6 4.5-1.6S9.8 21 12 21s2.2-1.6 4.5-1.6S18.8 21 21 21M12 13V4m0 0C8 4 5.5 6.5 5 10h14c-.5-3.5-3-6-7-6Z" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';

function pinHtml(selected: boolean, kind: MapZone["kind"]) {
  return (
    `<span class="pc-pin ${kind}${selected ? " sel" : ""}">` +
    `<svg viewBox="0 0 24 24" aria-hidden="true">${kind === "playa" ? ICON_BEACH : ICON_CITY}</svg></span>`
  );
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
  const wrapRef = useRef<HTMLDivElement>(null);
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const meRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const onSelectRef = useRef(onSelect);
  const zonesRef = useRef(zones);
  const [dark, setDark] = useState(false);
  const [full, setFull] = useState(false);
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
    const map = L.map(elRef.current, {
      scrollWheelZoom: false,
      zoomControl: false,
      attributionControl: true,
    }).setView([10.37, -75.55], 10);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    tileRef.current = L.tileLayer(readDark() ? TILES.dark : TILES.light, {
      maxZoom: 19,
      subdomains: "abcd",
      attribution: ATTRIBUTION,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    meRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // Las etiquetas con el nombre de la zona solo se ven con zoom suficiente.
    const syncZoom = () => {
      elRef.current?.classList.toggle("zoom-low", map.getZoom() < 12);
    };
    map.on("zoomend", syncZoom);
    syncZoom();
    map.on("click", () => onSelectRef.current(null));

    return () => {
      map.remove();
      mapRef.current = null;
      tileRef.current = null;
      layerRef.current = null;
      meRef.current = null;
    };
  }, []);

  // Cambiar de mosaico claro/oscuro sin recrear el mapa.
  useEffect(() => {
    tileRef.current?.setUrl(dark ? TILES.dark : TILES.light);
  }, [dark]);

  // Dibujar marcadores solo cuando cambian las zonas visibles.
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    markersRef.current.clear();
    zones.forEach((z) => {
      const icon = L.divIcon({
        className: "pc-pin-wrap",
        html: pinHtml(false, z.kind),
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });
      const m = L.marker([z.lat, z.lng], { icon, title: z.name, alt: `Zona ${z.name}`, keyboard: true });
      // Si hay otra zona muy cerca, la del norte pone su etiqueta arriba y la del sur abajo (sin solaparse).
      const near = zones.some((o) => o.id !== z.id && Math.abs(o.lat - z.lat) < 0.06 && Math.abs(o.lng - z.lng) < 0.06 && o.lat < z.lat);
      m.bindTooltip(z.name, { permanent: true, direction: near ? "top" : "bottom", offset: [0, near ? -14 : 14], className: "pc-label" });
      m.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectRef.current(z.id);
      });
      m.addTo(layer);
      markersRef.current.set(z.id, m);
    });
    if (zones.length) {
      const bounds = L.latLngBounds(zones.map((z) => [z.lat, z.lng] as [number, number]));
      map.fitBounds(bounds, { paddingTopLeft: [56, 76], paddingBottomRight: [56, 64], maxZoom: 13 });
    }
  }, [zones]);

  // Resaltar el marcador seleccionado sin recrearlo.
  useEffect(() => {
    zones.forEach((z) => {
      markersRef.current.get(z.id)?.setIcon(
        L.divIcon({
          className: "pc-pin-wrap",
          html: pinHtml(z.id === selectedId, z.kind),
          iconSize: [38, 38],
          iconAnchor: [19, 19],
        })
      );
    });
  }, [zones, selectedId]);

  // Centrar el mapa en la zona seleccionada (dejando espacio para la tarjeta).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const z = zonesRef.current.find((x) => x.id === selectedId);
    if (!z) return;
    const target = L.latLng(z.lat, z.lng);
    const zoom = Math.max(map.getZoom(), 13);
    const size = map.getSize();
    const pt = map.project(target, zoom).add([0, size.y * 0.18]);
    map.flyTo(map.unproject(pt, zoom), zoom, { duration: 0.7 });
  }, [selectedId]);

  // Pantalla completa (CSS fijo: funciona también en iPhone) + tecla Esc.
  useEffect(() => {
    document.body.style.overflow = full ? "hidden" : "";
    const t = window.setTimeout(() => mapRef.current?.invalidateSize(), 60);
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
    const me = meRef.current;
    if (!map || !me) return;
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
        me.clearLayers();
        L.circle(here, { radius: Math.max(pos.coords.accuracy, 20), className: "pc-me-acc", interactive: false }).addTo(me);
        L.marker(here, {
          icon: L.divIcon({ className: "pc-pin-wrap", html: '<span class="pc-me"></span>', iconSize: [18, 18], iconAnchor: [9, 9] }),
          interactive: false,
          keyboard: false,
        }).addTo(me);
        const list = zonesRef.current;
        if (!list.length) return;
        const nearest = list
          .map((z) => ({ z, d: km(here, [z.lat, z.lng]) }))
          .sort((a, b) => a.d - b.d)[0];
        if (nearest.d > 60) {
          setLocMsg(`Estás a ${Math.round(nearest.d)} km de ${nearest.z.name}, la zona más cercana del mapa.`);
          map.fitBounds(L.latLngBounds([here, [nearest.z.lat, nearest.z.lng]]), { padding: [56, 56] });
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
    <div ref={wrapRef} className={`pc-map${full ? " pc-map--full" : ""}`}>
      <div ref={elRef} className="leaflet-host" role="application" aria-label="Mapa interactivo de zonas turísticas de Cartagena" />

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
        <div className="pc-tools">
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
