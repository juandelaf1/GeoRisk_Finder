import { useStore } from '../../store';
import { useT } from '../../i18n/LanguageContext';
import { NarrativeTimeline } from './NarrativeTimeline';
import { ScenarioComparison } from './ScenarioComparison';
import type { RankedCell } from '../../types';
import styles from './ExecutiveDashboard.module.css';

function getScoreBadge(score: number): string {
  if (score >= 0.7) return styles.scoreCritical;
  if (score >= 0.4) return styles.scoreHigh;
  if (score >= 0.2) return styles.scoreModerate;
  return styles.scoreLow;
}

function getScoreLabel(score: number, t: (key: string) => string): string {
  if (score >= 0.7) return t('risk.critical');
  if (score >= 0.4) return t('risk.high');
  if (score >= 0.2) return t('risk.moderate');
  return t('risk.low');
}

export function ExecutiveDashboard() {
  const t = useT();
  const ranking = useStore((s) => s.ranking);
  const executive = useStore((s) => s.executive);

  const totalCells = executive.criticalRegionCount && executive.criticalRegionCount > 0
    ? executive.criticalRegionCount : ranking.length || 0;
  const totalExposure = executive.totalExposure > 0
    ? executive.totalExposure
    : ranking.reduce((sum, r) => sum + (r.risk_score || 0) * 50000, 0);
  const avgBCR = executive.avgBCR > 0
    ? executive.avgBCR
    : ranking.length > 0
      ? ranking.reduce((sum, r) => sum + 1.5 / (r.risk_score || 0.01), 0) / ranking.length
      : 0;
  const globalRiskMean = executive.globalRiskMean > 0
    ? executive.globalRiskMean
    : ranking.length > 0
      ? ranking.reduce((sum, r) => sum + (r.risk_score || 0), 0) / ranking.length
      : 0;

  const criticalRegions: RankedCell[] = [...ranking]
    .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))
    .slice(0, 5);

  return (
    <div className={styles.dashboard}>
      <div className={styles.kpiRow}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiValue}>{totalCells.toLocaleString()}</span>
          </div>
            <span className={styles.kpiLabel}>{t('exec.cellsAtRisk')}</span>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiValue}>${(totalExposure / 1e9).toFixed(1)}B</span>
          </div>
            <span className={styles.kpiLabel}>{t('exec.totalExposure')}</span>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiValue}>{avgBCR.toFixed(2)}</span>
          </div>
            <span className={styles.kpiLabel}>{t('exec.avgBcr')}</span>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiValue}>{globalRiskMean > 0 ? Math.round(globalRiskMean * 100) : t('exec.na')}</span>
          </div>
            <span className={styles.kpiLabel}>{t('exec.globalRiskMean')}</span>
        </div>
      </div>

      <div className={styles.middleGrid}>
        <div className={styles.middleCol}>
          <NarrativeTimeline />
        </div>
        <div className={styles.middleCol}>
          <ScenarioComparison />
        </div>
      </div>

      <div className={styles.sectionTitle}>{t('exec.criticalRegions')}</div>
      <div className={styles.regionList}>
        {criticalRegions.length === 0 && (
          <div className={styles.empty}>{t('exec.noRanking')}</div>
        )}
        {criticalRegions.map((region, i) => {
          const score = region.risk_score || 0;
          const exposure = region.exposure !== undefined ? region.exposure : 0;
          return (
            <div key={region.cell_id || i} className={styles.regionItem}>
              <span className={styles.rank}>#{i + 1}</span>
              <div className={styles.regionInfo}>
                <span className={styles.regionName}>
                  {region.region || region.cell_id?.slice(0, 8) || `Zone ${i + 1}`}
                </span>
                <div className={styles.regionMeta}>
                  <span>${exposure.toFixed(1)}M</span>
                </div>
              </div>
              <span className={`${styles.scoreBadge} ${getScoreBadge(score)}`}>
                {getScoreLabel(score, t)}
              </span>
              <span className={styles.regionScore}>{score.toFixed(2)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
