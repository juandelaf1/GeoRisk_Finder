import { useState, useMemo, useEffect } from 'react';
import { useStore } from '../../store';
import { fetchSearch } from '../../api/client';
import type { SearchResult } from '../../types';
import { useT } from '../../i18n/LanguageContext';
import styles from './Sidebar.module.css';

type SubTab = 'ranking' | 'explore';

function formatCoord(value: number, lat: boolean): string {
  const abs = Math.abs(value).toFixed(1);
  const dir = lat
    ? (value >= 0 ? 'N' : 'S')
    : (value >= 0 ? 'E' : 'W');
  return `${abs}°${dir}`;
}

function getRegionAggregates(cells: { risk_score: number; n_earthquakes: number; n_cyclones: number; n_volcanoes: number; cell_id: string; lat: number; lon: number; region?: string }[]) {
  const byRegion: Record<string, { maxScore: number; cellCount: number; totalEq: number; totalCy: number; totalVo: number; cells: typeof cells }> = {};
  for (const c of cells) {
    const r = c.region || 'Unknown';
    if (!byRegion[r]) {
      byRegion[r] = { maxScore: 0, cellCount: 0, totalEq: 0, totalCy: 0, totalVo: 0, cells: [] };
    }
    const entry = byRegion[r];
    entry.maxScore = Math.max(entry.maxScore, c.risk_score || 0);
    entry.cellCount += 1;
    entry.totalEq += c.n_earthquakes || 0;
    entry.totalCy += c.n_cyclones || 0;
    entry.totalVo += c.n_volcanoes || 0;
    entry.cells.push(c);
  }
  return byRegion;
}

function nearestCell<T extends { lat: number; lon: number }>(cells: T[], lat: number, lon: number): T | null {
  let best: T | null = null;
  let bestDist = Infinity;
  for (const c of cells) {
    const dist = (c.lat - lat) ** 2 + (c.lon - lon) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = c;
    }
  }
  return best;
}

export function RankingTab() {
  const ranking = useStore((s) => s.ranking);
  const { minRiskScore, setSelectedCell, selectedCluster, ui, setViewState, toggleIntelPanel } = useStore();

  const t = useT();
  const [subTab, setSubTab] = useState<SubTab>('ranking');
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [placeQuery, setPlaceQuery] = useState<string>('');
  const [placeResult, setPlaceResult] = useState<SearchResult | null>(null);
  const [placeLoading, setPlaceLoading] = useState(false);

  const regions = Array.from(new Set(ranking.map((r) => r.region).filter(Boolean))).sort();

  const filteredByCluster = ranking.filter((item) => {
    if (selectedCluster === undefined || selectedCluster === null) return true;
    return item.kmeans_cluster === selectedCluster;
  });

  const regionAggregates = getRegionAggregates(filteredByCluster);
  const sortedRegions = Object.entries(regionAggregates)
    .sort(([, a], [, b]) => b.maxScore - a.maxScore)
    .slice(0, 15);

  const regionCells = selectedRegion
    ? filteredByCluster.filter((item) => item.region === selectedRegion)
    : [];

  const rankingFiltered = sortedRegions.map(([region, agg]) => ({ region, ...agg })).filter((r) => r.maxScore >= minRiskScore);

  const placeCell = useMemo(() => {
    if (!placeResult) return null;
    return nearestCell(regionCells, placeResult.lat, placeResult.lon);
  }, [placeResult, regionCells]);

  useEffect(() => {
    if (placeQuery.trim().length < 3) {
      setPlaceResult(null);
      setPlaceLoading(false);
      return;
    }
    setPlaceLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetchSearch(placeQuery);
        setPlaceResult(res.length > 0 ? res[0] : null);
      } catch {
        setPlaceResult(null);
      } finally {
        setPlaceLoading(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [placeQuery]);

  const handleCellSelect = (cell: { cell_id: string; lat: number; lon: number; risk_score: number; n_earthquakes: number; n_cyclones: number; n_volcanoes: number }) => {
    setSelectedCell(cell as import('../../types').RiskCell);
    setViewState({ latitude: cell.lat, longitude: cell.lon, zoom: 5, bearing: 0, pitch: 0 });
    toggleIntelPanel();
  };

  const handleRegionClick = (region: string) => {
    setSelectedRegion(region);
    setSubTab('explore');
  };

  const handlePlaceSelect = () => {
    if (placeCell) handleCellSelect(placeCell as any);
  };

  const noResultsInExplore = selectedRegion && regionCells.filter((c) => c.risk_score >= minRiskScore).length === 0 && regionCells.length > 0;

  return (
    <>
      <div className={styles.sectionTitle}>{t('ranking.title')}</div>
      <div className={styles.subtabs}>
        <button
          className={`${styles.subtab} ${subTab === 'ranking' ? styles.subtabActive : ''}`}
          onClick={() => setSubTab('ranking')}
        >
          {t('ranking.tabRanking')}
        </button>
        <button
          className={`${styles.subtab} ${subTab === 'explore' ? styles.subtabActive : ''}`}
          onClick={() => { setSubTab('explore'); setSelectedRegion(''); setPlaceQuery(''); setPlaceResult(null); }}
        >
          {t('ranking.tabExplore')}
        </button>
      </div>

      {subTab === 'ranking' && (
        <div className={styles.rankingList}>
          {rankingFiltered.map((r) => {
            const hue = Math.round((1 - r.maxScore) * 120);
            return (
              <div
                key={r.region}
                className={styles.rankingItem}
                onClick={() => handleRegionClick(r.region)}
              >
                <div className={styles.pos}></div>
                <div className={styles.name}>{r.region}</div>
                <div className={styles.score} style={{ color: `hsl(${hue}, 80%, 55%)` }}>
                  {r.maxScore.toFixed(2)}
                </div>
                <div className={styles.factors}>
                  {r.cellCount} celda{r.cellCount !== 1 ? 's' : ''} · {t('ranking.eq')}{r.totalEq} {t('ranking.cy')}{r.totalCy} {t('ranking.vo')}{r.totalVo}
                </div>
              </div>
            );
          })}
          {rankingFiltered.length === 0 && (
            <div className={styles.emptyState}>{t('ranking.noRegions')}</div>
          )}
        </div>
      )}

      {subTab === 'explore' && (
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label htmlFor="explore-region">{t('ranking.region')}</label>
            <select
              id="explore-region"
              value={selectedRegion}
              onChange={(e) => { setSelectedRegion(e.target.value); setPlaceQuery(''); setPlaceResult(null); }}
            >
              <option value="">{t('ranking.allRegions')}</option>
              {regions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label htmlFor="explore-search">{t('ranking.exploreSearch')}</label>
            <input
              id="explore-search"
              type="text"
              className={styles.searchInput}
              placeholder={t('ranking.placePlaceholder')}
              value={placeQuery}
              onChange={(e) => { setPlaceQuery(e.target.value); setPlaceResult(null); }}
            />
          </div>
          {placeLoading && <div className={styles.hint}>{t('ranking.searching')}</div>}
          {!placeLoading && placeQuery.trim().length >= 3 && placeResult && (
            <div
              className={`${styles.rankingItem} ${styles.active}`}
              onClick={handlePlaceSelect}
            >
              <div className={styles.pos}>📍</div>
              <div style={{ flex: 1 }}>
                <div className={styles.name}>{placeResult.label}</div>
                <div className={styles.factors}>
                  {placeCell
                    ? t('ranking.placeFound')
                    : t('ranking.placeNoCell')}
                </div>
              </div>
            </div>
          )}
          {!placeLoading && placeQuery.trim().length >= 3 && !placeResult && (
            <div className={styles.emptyState}>{t('ranking.noResults')}</div>
          )}
        </div>
      )}

      {subTab === 'explore' && (
        <div className={styles.rankingList}>
          {regionCells
            .filter((item) => item.risk_score >= minRiskScore)
            .map((item) => {
              const score = item.risk_score || 0;
              const hue = Math.round((1 - score) * 120);
              return (
                <div
                  key={item.cell_id}
                  className={`${styles.rankingItem} ${ui.selectedCell?.cell_id === item.cell_id ? styles.active : ''}`}
                  onClick={() => handleCellSelect(item)}
                >
                  <div className={styles.pos}></div>
                  <div className={styles.name}>
                    {formatCoord(item.lat, true)} {formatCoord(item.lon, false)}
                  </div>
                  <div className={styles.score} style={{ color: `hsl(${hue}, 80%, 55%)` }}>
                    {score.toFixed(2)}
                  </div>
                  <div className={styles.factors}>
                    {t('ranking.eq')}{item.n_earthquakes || 0} {t('ranking.cy')}{item.n_cyclones || 0} {t('ranking.vo')}{item.n_volcanoes || 0}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {subTab === 'explore' && noResultsInExplore && (
        <div className={styles.emptyState}>{t('ranking.noCells')}</div>
      )}
    </>
  );
}
