import { useStore } from '../../store';
import { useT } from '../../i18n/LanguageContext';
import type { RiskCell } from '../../types';
import styles from './NarrativeTimeline.module.css';

interface Props {
  cell?: RiskCell;
  year?: number;
  scenario?: string;
}

const SCENARIO_COLORS: Record<string, string> = {
  ssp126: '#3A6B1E',
  ssp245: '#20808D',
  ssp370: '#B37D00',
  ssp585: '#A84B2F',
};

function generateNarrative2024(cell: RiskCell | undefined, t: (key: string, vars?: Record<string, string | number>) => string): string {
  if (!cell) {
    return t('narrative.fallbackNow');
  }
  const level = cell.risk_score >= 0.7 ? t('risk.critical') : cell.risk_score >= 0.4 ? t('risk.high') : cell.risk_score >= 0.2 ? t('risk.moderate') : t('risk.low');
  const hazards: string[] = [];
  if (cell.n_earthquakes > 0) hazards.push(`${cell.n_earthquakes} ${t('dc.hazardsEarthquakes')}`);
  if (cell.n_cyclones > 0) hazards.push(`${cell.n_cyclones} ${t('dc.hazardsCyclones')}`);
  if (cell.n_volcanoes > 0) hazards.push(`${cell.n_volcanoes} ${t('dc.hazardsVolcanoes')}`);
  const hazardText = hazards.length > 0 ? hazards.join(', ') : t('riskStory.noEvents');
  return t('narrative.cellNow', { level, hazardText });
}

function generateNarrative2050(scenarioId: string, cell: RiskCell | undefined, t: (key: string, vars?: Record<string, string | number>) => string): string {
  const severity: Record<string, { dir: string; pct: string; hazard: string }> = {
    ssp126: { dir: t('narrative.slightDecrease'), pct: t('narrative.pct5'), hazard: t('narrative.hazardSeaLevel') },
    ssp245: { dir: t('narrative.increase'), pct: t('narrative.pct15'), hazard: t('narrative.hazardPrecipitation') },
    ssp370: { dir: t('narrative.significantIncrease'), pct: t('narrative.pct35'), hazard: t('narrative.hazardHeatwave') },
    ssp585: { dir: t('narrative.sharpIncrease'), pct: t('narrative.pct55'), hazard: t('narrative.hazardCompound') },
  };
  const s = severity[scenarioId] || severity.ssp245;
  const scName = scenarioId.toUpperCase().replace('SSP', 'SSP');
  if (!cell) {
    return t('narrative.fallbackMid', { scName, dir: s.dir, pct: s.pct, hazard: s.hazard });
  }
  const hazard = cell.risk_score > 0.5 ? s.hazard : t('narrative.hazardPrecipDefault');
  return t('narrative.cellMid', { scName, dir: s.dir, pct: s.pct, hazard });
}

function generateNarrative2100(scenarioId: string, cell: RiskCell | undefined, t: (key: string, vars?: Record<string, string | number>) => string): string {
  const outcomes: Record<string, { outcome: string; action: string }> = {
    ssp126: { outcome: t('narrative.outcome126'), action: t('narrative.action126') },
    ssp245: { outcome: t('narrative.outcome245'), action: t('narrative.action245') },
    ssp370: { outcome: t('narrative.outcome370'), action: t('narrative.action370') },
    ssp585: { outcome: t('narrative.outcome585'), action: t('narrative.action585') },
  };
  const o = outcomes[scenarioId] || outcomes.ssp245;
  if (!cell) {
    return t('narrative.fallbackEnd', { outcome: o.outcome, action: o.action });
  }
  return t('narrative.cellEnd', { outcome: o.outcome, action: o.action });
}

export function NarrativeTimeline({ cell: propCell }: Props) {
  const t = useT();
  const cell = useStore((s) => propCell || s.ui.selectedCell || undefined);
  const scenarioActive = useStore((s) => s.scenario.active);
  const timelineYear = useStore((s) => s.timeline.year);

  const narrative = (() => {
    if (timelineYear <= 2030) return { year: t('narrative.now'), text: generateNarrative2024(cell, t), color: '#20808D' };
    if (timelineYear <= 2070) return { year: t('narrative.midCentury', { year: timelineYear }), text: generateNarrative2050(scenarioActive, cell, t), color: SCENARIO_COLORS[scenarioActive] || '#20808D' };
    return { year: t('narrative.endCentury', { year: timelineYear }), text: generateNarrative2100(scenarioActive, cell, t), color: SCENARIO_COLORS[scenarioActive] || '#20808D' };
  })();

  return (
    <div className={styles.container}>
      <div className={styles.sectionTitle}>{t('narrative.title')}</div>
      <div className={styles.timeline}>
        <div className={styles.period}>
          <div className={styles.periodDot} style={{ background: narrative.color }} />
          <div className={styles.periodYear}>{narrative.year}</div>
          <div className={styles.periodText}>{narrative.text}</div>
        </div>
      </div>
    </div>
  );
}
