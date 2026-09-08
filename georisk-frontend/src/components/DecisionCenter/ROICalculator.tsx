import { useT } from '../../i18n/LanguageContext';
import type { RiskCell } from '../../types';
import styles from './DecisionCenter.module.css';

interface Props {
  cell: RiskCell;
}

export function ROICalculator({ cell }: Props) {
  const t = useT();
  const score = cell.risk_score ?? 0;
  const exposure = score * 50000;
  const annualLoss = exposure * 0.027;

  const investment = 50000;
  const benefit = annualLoss * 0.7;
  const bcr = investment > 0 ? benefit / investment : 0;
  const payback = benefit > 0 ? investment / (benefit / 12) : 0;
  const roiScore = Math.min((bcr / 3) * 100, 100);

  return (
    <div className={styles.roiSection}>
      <div className={styles.roiGrid}>
        <div className={styles.roiItem}>
          <span className={styles.roiValue}>{bcr.toFixed(2)}{t('roi.times')}</span>
          <span className={styles.roiLabel}>{t('roi.bcr')}</span>
        </div>
        <div className={styles.roiItem}>
          <span className={styles.roiValue}>{payback.toFixed(1)} {t('roi.months')}</span>
          <span className={styles.roiLabel}>{t('roi.payback')}</span>
        </div>
        <div className={styles.roiItem}>
          <span className={styles.roiValue}>${benefit.toFixed(0)}</span>
          <span className={styles.roiLabel}>{t('roi.annualBenefit')}</span>
        </div>
      </div>

      <div className={styles.roiBarSection}>
        <div className={styles.roiBarHeader}>
          <span className={styles.roiBarLabel}>{t('roi.score')}</span>
          <span className={styles.roiBarValue}>{roiScore.toFixed(0)}%</span>
        </div>
        <div className={styles.roiTrack}>
          <div
            className={styles.roiFill}
            style={{
              width: `${roiScore}%`,
              background: roiScore > 66 ? 'var(--color-success)' : roiScore > 33 ? 'var(--color-gold)' : 'var(--color-warning)',
            }}
          />
        </div>
      </div>
    </div>
  );
}
