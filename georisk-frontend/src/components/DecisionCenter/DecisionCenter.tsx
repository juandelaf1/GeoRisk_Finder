import { useStore } from '../../store';
import { useT } from '../../i18n/LanguageContext';
import { RiskScoreCard } from './RiskScoreCard';
import { RiskStory } from './RiskStory';
import { EconomicImpact } from './EconomicImpact';
import { EventExplorer } from './EventExplorer';
import { ActionBar } from './ActionBar';
import { RecommendedActions } from './RecommendedActions';
import { ContingencyMeasures } from './ContingencyMeasures';

import styles from './DecisionCenter.module.css';



export function DecisionCenter() {
  const ui = useStore((s) => s.ui);
  const expandedSections = useStore((s) => s.decisionCenter.expandedSections);
  const setDecisionSection = useStore((s) => s.setDecisionSection);
  const toggleIntelPanel = useStore((s) => s.toggleIntelPanel);
  const t = useT();
  const ranking = useStore((s) => s.ranking);

  const sections = [
    { key: 'risk', label: t('dc.score'), icon: '📊' },
    { key: 'story', label: t('dc.story'), icon: '📋' },
    { key: 'hazards', label: t('dc.hazards'), icon: '⚠️' },
    { key: 'economic', label: t('dc.economic'), icon: '💰' },
    { key: 'actions', label: t('dc.actions'), icon: '🎯' },
    { key: 'events', label: t('dc.events'), icon: '🔍' },
    { key: 'contingency', label: t('dc.response'), icon: '🚨' },
  ];
  const cell = ui.selectedCell;

  if (!cell) return null;

  const rank = ranking.findIndex(
    (r) => r.cell_id === cell.cell_id || (r.lat === cell.lat && r.lon === cell.lon)
  ) + 1;
  const total = ranking.length || 1;

  const toggle = (key: string) => {
    setDecisionSection(key, !expandedSections[key]);
  };

  return (
    <aside className={`${styles.panel} ${!ui.intelPanelOpen ? styles.hidden : ''}`}>
      <div className={styles.header}>
          <h2 className={styles.title}>
            <span className={styles.titleIcon}>🎯</span>
            {t('dc.title')}
          </h2>
          <button className={styles.closeBtn} onClick={toggleIntelPanel}>{t('dc.close')}</button>
      </div>

      <div className={styles.content}>
        <RiskScoreCard cell={cell} rank={rank} total={total} />

          <div className={styles.verdict}>
          {cell.risk_score >= 0.7 ? '🔴' : cell.risk_score >= 0.4 ? '🟡' : '🟢'} {getRiskCategory(cell.risk_score, t).label} {t('dc.risk')} — {t('dc.drivenBy')} {getPrimaryHazard(cell, t)}
        </div>

        {sections.slice(1).map((sec) => {
          const open = expandedSections[sec.key] ?? false;
          return (
            <div key={sec.key} className={styles.section}>
              <button
                className={styles.sectionHeader}
                onClick={() => toggle(sec.key)}
              >
                <span className={styles.sectionIcon}>{sec.icon}</span>
                <span className={styles.sectionLabel}>{sec.label}</span>
                <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}>
                  ▸
                </span>
              </button>
              {open && (
                <div className={styles.sectionBody}>
                  {sec.key === 'story' && <RiskStory cell={cell} />}
                  {sec.key === 'hazards' && <HazardSection cell={cell} />}
                  {sec.key === 'economic' && <EconomicImpact cell={cell} />}
                  {sec.key === 'contingency' && <ContingencyMeasures cell={cell} />}
                  {sec.key === 'actions' && <RecommendedActions cell={cell} />}
                  {sec.key === 'events' && <EventExplorer cell={cell} />}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ActionBar cell={cell} />
    </aside>
  );
}

function getRiskCategory(score: number, t: ReturnType<typeof useT>): { label: string; color: string } {
  if (score >= 0.75) return { label: t('dc.critical'), color: '#A84B2F' };
  if (score >= 0.5) return { label: t('dc.high'), color: '#B37D00' };
  if (score >= 0.25) return { label: t('dc.moderate'), color: '#7A3B49' };
  return { label: t('dc.low'), color: '#3A6B1E' };
}

function getPrimaryHazard(cell: import('../../types').RiskCell, t: ReturnType<typeof useT>): string {
  const eq = cell.n_earthquakes ?? 0;
  const cyc = cell.n_cyclones ?? 0;
  const vol = cell.n_volcanoes ?? 0;
  const max = Math.max(eq, cyc, vol);
  if (max === 0) return t('dc.baselineHazards');
  if (max === eq) return `${t('dc.hazardsEarthquakes')} (${eq} ${t('dc.eventsCount')})`;
  if (max === cyc) return `${t('dc.hazardsCyclones')} (${cyc} ${t('dc.eventsCount')})`;
  return `${t('dc.hazardsVolcanoes')} (${vol} ${t('dc.eventsCount')})`;
}

function HazardSection({ cell }: { cell: import('../../types').RiskCell }) {
  const t = useT();
  const maxVal = Math.max(cell.n_earthquakes ?? 0, cell.n_cyclones ?? 0, cell.n_volcanoes ?? 0, 1);

  const hazards = [
    { label: t('dc.hazardsEarthquakes'), value: cell.n_earthquakes ?? 0, pct: ((cell.n_earthquakes ?? 0) / maxVal) * 100, color: '#A84B2F' },
    { label: t('dc.hazardsCyclones'), value: cell.n_cyclones ?? 0, pct: ((cell.n_cyclones ?? 0) / maxVal) * 100, color: '#B37D00' },
    { label: t('dc.hazardsVolcanoes'), value: cell.n_volcanoes ?? 0, pct: ((cell.n_volcanoes ?? 0) / maxVal) * 100, color: '#7A3B49' },
  ];

  return (
    <div className={styles.hazardSection}>
      {hazards.map((h) => (
        <div key={h.label} className={styles.hazardRow}>
          <div className={styles.hazardRowHeader}>
            <span className={styles.hazardLabel}>{h.label}</span>
            <span className={styles.hazardCount}>{h.value} {t('dc.eventsCount')}</span>
          </div>
          <div className={styles.hazardTrack}>
            <div
              className={styles.hazardFill}
              style={{ width: `${h.pct}%`, background: h.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
