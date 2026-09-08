import { useT } from '../../i18n/LanguageContext';
import type { RiskCell } from '../../types';
import styles from './DecisionCenter.module.css';

interface Props {
  cell: RiskCell;
  rank: number;
  total: number;
}

function getRiskCategory(score: number, t: ReturnType<typeof useT>): { label: string; color: string } {
  if (score >= 0.75) return { label: t('risk.critical'), color: '#A84B2F' };
  if (score >= 0.5) return { label: t('risk.high'), color: '#B37D00' };
  if (score >= 0.25) return { label: t('risk.moderate'), color: '#7A3B49' };
  return { label: t('risk.low'), color: '#3A6B1E' };
}

export function RiskScoreCard({ cell, rank, total }: Props) {
  const t = useT();
  const score = cell.risk_score ?? 0;
  const hue = Math.round((1 - score) * 120);
  const category = getRiskCategory(score, t);

  return (
    <div className={styles.scoreCard}>
      <div className={styles.scoreCircleOuter}>
        <svg width="100" height="100" viewBox="0 0 100 100">
          <circle
            cx="50" cy="50" r="44"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="6"
          />
          <circle
            cx="50" cy="50" r="44"
            fill="none"
            stroke={`hsl(${hue}, 80%, 55%)`}
            strokeWidth="6"
            strokeDasharray={`${score * 276} 276`}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
          />
        </svg>
        <div className={styles.scoreValue} style={{ color: `hsl(${hue}, 80%, 55%)` }}>
          {(score * 100).toFixed(0)}
        </div>
      </div>
      <div className={styles.scoreMeta}>
        <span className={styles.riskLabel} style={{ color: category.color }}>
          {category.label}
        </span>
        <span className={styles.riskScore}>{t('riskScore.label')} {score.toFixed(2)}</span>
      </div>
      <div className={styles.rankRow}>
        <div className={styles.rankItem}>
          <span className={styles.rankValue}>{t('riskScore.rank')}{rank}</span>
          <span className={styles.rankLabel}>{t('riskScore.of')} {total} {t('riskScore.cells')}</span>
        </div>
      </div>
    </div>
  );
}
