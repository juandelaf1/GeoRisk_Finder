import { useStore } from '../../store';
import { useT } from '../../i18n/LanguageContext';
import type { RiskCell } from '../../types';
import styles from './ScenarioComparison.module.css';

interface Props {
  cell?: RiskCell;
}



function getProjectedRisk(scenarioId: string, baseRisk: number): number {
  const multipliers: Record<string, number> = {
    ssp126: 0.8,
    ssp245: 1.0,
    ssp370: 1.35,
    ssp585: 1.7,
  };
  const m = multipliers[scenarioId] || 1.0;
  return Math.min(baseRisk * m, 1);
}

export function ScenarioComparison({ cell: propCell }: Props) {
  const t = useT();
  const cell = useStore((s) => propCell || s.ui.selectedCell);
  const scenario = useStore((s) => s.scenario.available);
  const timelineYear = useStore((s) => s.timeline.year);

  if (!scenario || scenario.length === 0) {
    return <div className={styles.container}><div className={styles.empty}>{t('scenario.empty')}</div></div>;
  }

  const yearFactor = 1 + (timelineYear - 2024) * 0.003;
  const baseRisk = Math.min((cell?.risk_score ?? 0.35) * yearFactor, 1);

  return (
    <div className={styles.container}>
      <div className={styles.sectionTitle}>{t('scenario.title')}</div>
      <div className={styles.grid}>
        {scenario.map((sc) => {
          const projectedRisk = getProjectedRisk(sc.id, baseRisk);
          const barHeight = projectedRisk * 100;
          return (
            <div key={sc.id} className={styles.scenarioCol}>
              <div className={styles.scenarioLabel} style={{ color: sc.color }}>
                {sc.label}
              </div>
              <div className={styles.barTrack}>
                <div
                  className={styles.scenarioBar}
                  style={{
                    height: `${barHeight}%`,
                    background: sc.color,
                  }}
                />
              </div>
              <div className={styles.scenarioValue} style={{ color: sc.color }}>
                {projectedRisk.toFixed(1)}
              </div>
              <div className={styles.scenarioImpact}>{sc.id === 'ssp126' ? t('scenario.sustainable') : sc.id === 'ssp245' ? t('scenario.moderate') : sc.id === 'ssp370' ? t('scenario.severe') : sc.id === 'ssp585' ? t('scenario.critical') : sc.description}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
