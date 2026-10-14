'use client';

import React, { useEffect, useRef } from 'react';

// Loaded dynamically (no SSR) — leaflet CSS injected at runtime
export default function ServiceAreaMap({ lat, lng, radiusKm, onChange, editable = false, height = 300 }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Inject leaflet CSS once
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    import('leaflet').then((L) => {
      const Leaflet = L.default;

      // Fix default icon paths broken by webpack
      delete Leaflet.Icon.Default.prototype._getIconUrl;
      Leaflet.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (mapRef.current) {
        // Update existing map
        mapRef.current.setView([lat, lng]);
        markerRef.current?.setLatLng([lat, lng]);
        circleRef.current?.setLatLng([lat, lng]);
        circleRef.current?.setRadius(radiusKm * 1000);
        return;
      }

      if (!containerRef.current) return;

      const map = Leaflet.map(containerRef.current, {
        center: [lat, lng],
        zoom: 8,
        zoomControl: true,
        dragging: true,
        scrollWheelZoom: false,
      });

      Leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      const circle = Leaflet.circle([lat, lng], {
        radius: radiusKm * 1000,
        color: '#f97316',
        fillColor: '#f97316',
        fillOpacity: 0.12,
        weight: 2,
      }).addTo(map);

      const marker = Leaflet.marker([lat, lng], { draggable: editable }).addTo(map);

      if (editable && onChange) {
        marker.on('dragend', (e) => {
          const { lat: newLat, lng: newLng } = e.target.getLatLng();
          circle.setLatLng([newLat, newLng]);
          onChange({ lat: newLat, lng: newLng });
        });
      }

      mapRef.current = map;
      markerRef.current = marker;
      circleRef.current = circle;
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
        circleRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep circle radius in sync with prop changes (slider)
  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius(radiusKm * 1000);
    }
  }, [radiusKm]);

  return (
    <div
      ref={containerRef}
      style={{ height, borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)', zIndex: 0 }}
    />
  );
}
