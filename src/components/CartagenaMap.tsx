"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { money, type MapZone } from "@/lib/data";

type Props = {
  zones: MapZone[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

function pinHtml(selected: boolean, kind: MapZone["kind"]) {
  const cls = `pc-pin ${kind}${selected ? " sel" : ""}`;
  return `<span class="${cls}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-7.2 7-12A7 7 0 1 0 5 9c0 4.8 7 12 7 12Z" fill="#fff"/></svg></span>`;
}

function popupHtml(z: MapZone) {
  const p = z.places[0];
  const prices = p.carta.map((c) => c.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const rate = p.ratings.find((r) => r.source.startsWith("Precio Claro"));
  const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  return `<div class="pc-pop"><strong>${esc(z.name)}</strong><span>${esc(p.type)}</span>` +
    `<span class="mono">Carta de referencia: ${money(min)} – ${money(max)}</span>` +
    (rate ? `<span>Calificación Precio Claro: ★ ${rate.stars.toFixed(1)} (${rate.count})</span>` : "") +
    `</div>`;
}

export default function CartagenaMap({ zones, selectedId, onSelect }: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // Crear el mapa una sola vez.
  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, { scrollWheelZoom: false, zoomControl: true }).setView([10.37, -75.55], 10);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // Dibujar marcadores solo cuando cambian las zonas filtradas (así el globo
  // emergente no se cierra al seleccionar una zona).
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
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -28],
      });
      const m = L.marker([z.lat, z.lng], { icon, title: z.name, alt: `Zona ${z.name}`, keyboard: true });
      m.bindPopup(popupHtml(z));
      m.on("click", () => onSelectRef.current(z.id));
      m.addTo(layer);
      markersRef.current.set(z.id, m);
    });
    if (zones.length) {
      const bounds = L.latLngBounds(zones.map((z) => [z.lat, z.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }
  }, [zones]);

  // Resaltar el marcador seleccionado sin recrearlo.
  useEffect(() => {
    zones.forEach((z) => {
      const m = markersRef.current.get(z.id);
      if (m) {
        m.setIcon(
          L.divIcon({
            className: "pc-pin-wrap",
            html: pinHtml(z.id === selectedId, z.kind),
            iconSize: [30, 30],
            iconAnchor: [15, 30],
            popupAnchor: [0, -28],
          })
        );
      }
    });
  }, [zones, selectedId]);

  // Mover el mapa a la zona seleccionada.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const z = zones.find((x) => x.id === selectedId);
    if (z) {
      map.flyTo([z.lat, z.lng], Math.max(map.getZoom(), 13), { duration: 0.8 });
      const m = markersRef.current.get(z.id);
      if (m) map.once("moveend", () => m.openPopup());
    }
  }, [selectedId, zones]);

  return <div ref={elRef} className="leaflet-host" role="application" aria-label="Mapa interactivo de zonas turísticas de Cartagena" />;
}
