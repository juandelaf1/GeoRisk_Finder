import { useState, useEffect } from 'react';
import { useT } from '../../i18n/LanguageContext';
import type { RiskCell } from '../../types';
import { fetchJSON } from '../../utils/fetchJSON';
import styles from './DecisionCenter.module.css';

interface Props {
  cell: RiskCell;
}

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export function EconomicImpact({ cell }: Props) {
  const t = useT();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const cellId = cell.cell_id || `${cell.lat.toFixed(4)}-${cell.lon.toFixed(4)}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchJSON<Record<string, unknown>>(`/economic/${cellId}`)
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [cellId]);

  if (loading) {
    return <div className={styles.economicSection} style={{ padding: '12px 0', textAlign: 'center', fontSize: 11, color: 'var(--color-text-muted)' }}>{t('economic.loading')}</div>;
  }

  if (!data) {
    return (
      <div className={styles.economicSection}>
        <div className={styles.contingencyEmpty}>
          <span className={styles.contingencyEmptyIcon}>💰</span>
          <span className={styles.contingencyEmptyText}>Economic data unavailable for this location</span>
        </div>
      </div>
    );
  }

  const metrics = [
    { label: t('economic.totalExposure'), value: formatCurrency(data.exposure as number), desc: t('economic.totalExposureDesc') },
    { label: t('economic.annualLoss'), value: formatCurrency(data.annual_loss as number), desc: t('economic.annualLossDesc') },
    { label: t('economic.inactionCost'), value: formatCurrency(data.cost_of_inaction_10y as number), desc: t('economic.inactionCostDesc') },
    { label: t('economic.adaptationCost'), value: formatCurrency(data.adaptation_cost as number), desc: t('economic.adaptationCostDesc') },
    { label: t('economic.netSavings'), value: formatCurrency(data.net_savings_10y as number), desc: (data.net_savings_10y as number > 0 ? t('economic.netSavingsPositive') : t('economic.netSavingsNegative')) },
  ];

  return (
    <div className={styles.economicSection}>
      {metrics.map((m) => (
        <div key={m.label} className={styles.metricRow}>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>{m.label}</span>
            <span className={styles.metricDesc}>{m.desc}</span>
          </div>
          <span className={styles.metricValue}>{m.value}</span>
        </div>
      ))}
    </div>
  );
}
