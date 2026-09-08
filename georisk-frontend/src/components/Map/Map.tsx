import { useEffect, useRef } from 'react';
import { useStore } from '../../store';
import { useT } from '../../i18n/LanguageContext';
import styles from './Map.module.css';

export function MapFallback() {
  const t = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  const { ranking, setSelectedCell } = useStore();

  useEffect(() => {
    if (!containerRef.current || typeof L === 'undefined') return;

    const map = L.map(containerRef.current, {
      center: [20, 0],
      zoom: 2,
      minZoom: 1,
      maxZoom: 10,
      scrollWheelZoom: true,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: t('map.attribution'),
      maxZoom: 10,
    }).addTo(map);

    const markers: any[] = [];
    ranking.forEach((item) => {
      const score = item.risk_score || 0;
      const hue = Math.round((1 - score) * 120);
      const marker = L.circleMarker([item.lat, item.lon], {
        radius: 8,
        fillColor: `hsl(${hue}, 80%, 55%)`,
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8,
      });
      marker.bindPopup(`
        <h4>${t('map.riskCell')} ${(item.cell_id || '').slice(0, 8)}</h4>
        <div>${t('map.riskScore')} ${score.toFixed(2)}</div>
        <div>${t('map.eqCycVol', { eq: item.n_earthquakes || 0, cyc: item.n_cyclones || 0, vol: item.n_volcanoes || 0 })}</div>
      `);
      marker.on('click', () => setSelectedCell(item));
      marker.addTo(map);
      markers.push(marker);
    });

    return () => {
      markers.forEach((m) => map.removeLayer(m));
      map.remove();
    };
  }, [ranking, setSelectedCell]);

  return <div ref={containerRef} className={styles.map} />;
}

declare const L: any;
