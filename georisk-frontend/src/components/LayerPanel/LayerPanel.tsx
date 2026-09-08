import { useStore } from '../../store';
import type { HazardFilters, Basemap } from '../../types';
import { useT } from '../../i18n/LanguageContext';
import styles from './LayerPanel.module.css';

const TOGGLES: { key: keyof HazardFilters; label: string; dot: string }[] = [
  { key: 'earthquakes', label: 'layerPanel.earthquakes', dot: '#e74c3c' },
  { key: 'cyclones', label: 'layerPanel.cyclones', dot: '#3498db' },
  { key: 'volcanoes', label: 'layerPanel.volcanoes', dot: '#e67e22' },
  { key: 'hexagons', label: 'layerPanel.hexagons', dot: '#20808d' },
  { key: 'heatmap', label: 'layerPanel.heatmap', dot: '#9b59b6' },
  { key: 'graticule', label: 'layerPanel.graticule', dot: '#6b7280' },
  { key: 'plates', label: 'layerPanel.plates', dot: '#94a3b8' },
];

const BASEMAPS: { key: Basemap; label: string }[] = [
  { key: 'dark', label: 'layerPanel.basemapDark' },
  { key: 'light', label: 'layerPanel.basemapLight' },
  { key: 'satellite', label: 'layerPanel.basemapSatellite' },
];

export function LayerPanel() {
  const { filters, setFilters, basemap, setBasemap } = useStore();
  const t = useT();

  return (
    <div className={styles.panel}>
      <div className={styles.title}>{t('layerPanel.title')}</div>
      <div className={styles.toggles}>
        {TOGGLES.map((tg) => (
          <label key={tg.key} className={styles.toggle} htmlFor={`layer-${tg.key}`}>
            <input
              id={`layer-${tg.key}`}
              name={tg.key}
              type="checkbox"
              checked={filters[tg.key]}
              onChange={(e) => setFilters({ [tg.key]: e.target.checked } as Partial<HazardFilters>)}
            />
            <span className={styles.dot} style={{ background: tg.dot }} />
            {t(tg.label)}
          </label>
        ))}
      </div>
      <div className={styles.basemapGroup}>
        <span className={styles.title}>{t('layerPanel.basemap')}</span>
        <div className={styles.basemapBtns}>
          {BASEMAPS.map((b) => (
            <button
              key={b.key}
              className={`${styles.basemapBtn} ${basemap === b.key ? styles.basemapBtnActive : ''}`}
              onClick={() => setBasemap(b.key)}
            >
              {t(b.label)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
