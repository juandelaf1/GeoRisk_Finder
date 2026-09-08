import { useEffect, useRef } from 'react';
import { useStore } from '../../store';
import { useT } from '../../i18n/LanguageContext';
import { createGlobe, updateGlobeLayers } from './deckgl';
import styles from './Globe.module.css';

export function Globe() {
  const t = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<ReturnType<typeof createGlobe> | null>(null);
  const layers = useStore((s) => s.layers);
  const projectedLayers = useStore((s) => s.projectedLayers);
  const loading = useStore((s) => s.loading);
  const minRiskScore = useStore((s) => s.minRiskScore);
  const alerts = useStore((s) => s.alerts);
  const filters = useStore((s) => s.filters);
  const basemap = useStore((s) => s.basemap);
  const year = useStore((s) => s.timeline.year);
  const scenario = useStore((s) => s.scenario);

  useEffect(() => {
    if (!containerRef.current) return;
    deckRef.current = createGlobe(containerRef.current);
    return () => {
      deckRef.current?.();
      deckRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (deckRef.current) {
      updateGlobeLayers(layers, projectedLayers, minRiskScore, basemap);
    }
  }, [layers, projectedLayers, minRiskScore, alerts, filters, basemap]);

  const activeScenario = scenario.available.find((s) => s.id === scenario.active);

  return (
    <div className={styles.globe}>
      <div ref={containerRef} className={styles.deckgl} />
      {projectedLayers.length > 0 && (
        <div className={styles.projectionBadge}>
          {t('globe.projection')} {year} · {activeScenario?.label || scenario.active}
        </div>
      )}
      <div className={styles.legend}>
        <span>{t('globe.legend.low')}</span>
        <div className={styles.gradient} />
        <span>{t('globe.legend.high')}</span>
      </div>
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <div className="loading-text">{t('globe.loading')}</div>
        </div>
      )}
    </div>
  );
}
