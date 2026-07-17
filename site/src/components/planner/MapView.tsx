"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LMap, LayerGroup } from "leaflet";

/**
 * Interactive map (Leaflet + OpenStreetMap tiles — production-ready and
 * key-free). The provider seam: swap this component for a Google Maps
 * implementation when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is configured.
 */

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  label: string;
  index?: number;
  kind: "item" | "place" | "package";
}

export default function MapView({
  points,
  selectedId,
  onSelect,
  routeIds,
}: {
  points: MapPoint[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  routeIds?: string[];
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !boxRef.current || mapRef.current) return;
      const map = L.map(boxRef.current, { zoomControl: true, attributionControl: true }).setView([24.7, 46.7], 5);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      mapRef.current = map;
      layerRef.current = L.layerGroup().addTo(map);
      // Ensure Leaflet reads the final container size (guards against layout races).
      setTimeout(() => map.invalidateSize(), 120);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    (async () => {
      const L = (await import("leaflet")).default;
      const map = mapRef.current;
      const layer = layerRef.current;
      if (!map || !layer) return;
      layer.clearLayers();

      const valid = points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng) && (p.lat !== 0 || p.lng !== 0));
      for (const p of valid) {
        const sel = p.id === selectedId;
        const icon = L.divIcon({
          className: "",
          html: `<div class="tpMarker${sel ? " sel" : ""}"><span>${p.index ?? (p.kind === "package" ? "★" : "•")}</span></div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 24],
        });
        const m = L.marker([p.lat, p.lng], { icon, title: p.label, alt: p.label });
        m.on("click", () => onSelect(p.id));
        m.bindPopup(`<strong>${p.label.replace(/</g, "&lt;")}</strong>`);
        m.addTo(layer);
      }

      if (routeIds && routeIds.length > 1) {
        const path = routeIds
          .map((id) => valid.find((p) => p.id === id))
          .filter(Boolean)
          .map((p) => [p!.lat, p!.lng] as [number, number]);
        if (path.length > 1) {
          L.polyline(path, { color: "#e5a52e", weight: 3, opacity: 0.8, dashArray: "6 8" }).addTo(layer);
        }
      }

      if (valid.length) {
        const bounds = L.latLngBounds(valid.map((p) => [p.lat, p.lng] as [number, number]));
        map.fitBounds(bounds.pad(0.25), { maxZoom: 14 });
      }
    })();
  }, [points, selectedId, routeIds, onSelect]);

  // Focus the selected marker.
  useEffect(() => {
    const map = mapRef.current;
    const p = points.find((x) => x.id === selectedId);
    if (map && p && Number.isFinite(p.lat)) map.panTo([p.lat, p.lng]);
  }, [selectedId, points]);

  return <div ref={boxRef} style={{ position: "absolute", inset: 0 }} role="application" aria-label="Trip map" />;
}
