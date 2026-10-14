'use client';

import React, { useEffect, useRef } from 'react';

export default function ServiceAreaMap({ lat, lng, radiusKm, onChange, editable = false, height = 300 }) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const markerRef    = useRef(null);
  const circleRef    = useRef(null);
  const onChangeRef  = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    import('leaflet').then((L) => {
      const Leaflet = L.default;

      if (mapRef.current) {
        if (!editable) {
          mapRef.current.setView([lat, lng]);
          markerRef.current?.setLatLng([lat, lng]);
          circleRef.current?.setLatLng([lat, lng]);
        }
        circleRef.current?.setRadius(radiusKm * 1000);
        return;
      }

      if (!containerRef.current) return;

      const map = Leaflet.map(containerRef.current, {
        center: [lat, lng],
        zoom: 8,
        zoomControl: editable,
        dragging: editable,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: editable,
        boxZoom: editable,
        keyboard: editable,
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

      if (!editable) {
        map.fitBounds(circle.getBounds(), { padding: [24, 24] });
      }

      if (editable && onChange) {
        // Circle follows map center in real-time
        map.on('move', () => {
          const c = map.getCenter();
          circle.setLatLng([c.lat, c.lng]);
        });
        // Save when pan ends — use ref so we always call the latest onChange
        map.on('moveend', () => {
          const c = map.getCenter();
          onChangeRef.current?.({ lat: c.lat, lng: c.lng });
        });
      } else {
        // View mode: static marker
        delete Leaflet.Icon.Default.prototype._getIconUrl;
        Leaflet.Icon.Default.mergeOptions({
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });
        markerRef.current = Leaflet.marker([lat, lng]).addTo(map);
      }

      mapRef.current  = map;
      circleRef.current = circle;
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current    = null;
        markerRef.current = null;
        circleRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    circleRef.current?.setRadius(radiusKm * 1000);
  }, [radiusKm]);

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={containerRef}
        style={{ height, borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)', zIndex: 0 }}
      />
      {editable && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none', zIndex: 1000 }}>
          <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#f97316', border: '3px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.35)' }} />
        </div>
      )}
    </div>
  );
}
