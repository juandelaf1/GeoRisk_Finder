import { useT } from '../../i18n/LanguageContext';
import type { RiskCell } from '../../types';
import styles from './DecisionCenter.module.css';

interface Props {
  cell: RiskCell;
}

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export function FinancialImpactStatement({ cell }: Props) {
  const t = useT();
  const score = cell.risk_score ?? 0;
  const exposure = score * 50000;
  const annualLoss = exposure * 0.027;
  const costOfInaction = annualLoss * 10;
  const adaptationCost = annualLoss * 0.6;
  const netSavings = costOfInaction - adaptationCost;
  const breakEvenYear = Math.ceil(adaptationCost / annualLoss);
  const revenue = Math.max(exposure * 1, 1);
  const pctOfRevenue = (annualLoss / revenue) * 100;

  const metrics = [
    {
      label: t('fis.annualLoss'),
      value: formatCurrency(annualLoss),
      desc: `${pctOfRevenue.toFixed(1)}% of regional economic activity`,
    },
    {
      label: t('fis.inactionCost'),
      value: formatCurrency(costOfInaction),
      desc: t('fis.inactionCostDesc'),
    },
    {
      label: t('fis.adaptationCost'),
      value: formatCurrency(adaptationCost),
      desc: t('fis.adaptationCostDesc'),
    },
    {
      label: t('fis.netSavings'),
      value: formatCurrency(netSavings),
      desc: netSavings > 0 ? t('fis.netSavingsPositive') : t('fis.netSavingsNegative'),
    },
    {
      label: t('fis.breakEvenYear'),
      value: `${breakEvenYear} ${t('fis.breakEvenValue')}`,
      desc: t('fis.breakEvenDesc'),
    },
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
