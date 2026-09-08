import { useState } from 'react';
import { useT } from '../../i18n/LanguageContext';
import type { RiskCell } from '../../types';
import styles from './DecisionCenter.module.css';

interface Props {
  cell: RiskCell;
}

interface ContingencyAction {
  priority: 'critical' | 'high' | 'medium' | 'low';
  hazard: string;
  warningWindow: string;
  icon: string;
  immediateActions: string[];
  contingencyMeasures: string[];
}

function getWarningWindow(hazard: string, value: number, t: ReturnType<typeof useT>): { window: string; priority: 'critical' | 'high' | 'medium' | 'low' } {
  if (value === 0) return { window: t('contingency.na'), priority: 'low' };
  switch (hazard) {
    case 'earthquake':
      return {
        window: value > 5 ? t('contingency.warningWindowEarthquake') : t('contingency.warningWindowEarthquakeLong'),
        priority: value > 5 ? 'critical' : 'high',
      };
    case 'tsunami':
      return {
        window: value > 0 ? t('contingency.warningWindowTsunami') : t('contingency.na'),
        priority: value > 0 ? 'critical' : 'low',
      };
    case 'volcano':
      return {
        window: value > 20 ? t('contingency.warningWindowVolcanoLong') : t('contingency.warningWindowVolcanoShort'),
        priority: value > 20 ? 'critical' : value > 5 ? 'high' : 'medium',
      };
    default:
      return { window: t('contingency.na'), priority: 'low' };
  }
}

function getImmediateActions(hazard: string, value: number, t: ReturnType<typeof useT>): string[] {
  switch (hazard) {
    case 'earthquake':
      return [
        t('contingency.immediateDrop'),
        t('contingency.immediateWindows'),
        value > 5 ? t('contingency.immediateEvacuate') : '',
      ].filter(Boolean);
    case 'tsunami':
      return [
        t('contingency.immediateHighGround'),
        t('contingency.immediateVertical'),
        t('contingency.immediateNoWait'),
      ];
    case 'volcano':
      return [
        t('contingency.immediateExclusion'),
        t('contingency.immediateMask'),
        t('contingency.immediateShelter'),
      ];
    default:
      return [];
  }
}

function getContingencyMeasures(hazard: string, value: number, t: ReturnType<typeof useT>): string[] {
  if (value === 0) return [];
  const measures: Record<string, string[]> = {
    earthquake: [
      t('contingency.measureSeismic'),
      t('contingency.measureSensors'),
      t('contingency.measureInspections'),
      t('contingency.measureSupplies'),
    ],
    tsunami: [
      t('contingency.measureSirens'),
      t('contingency.measureRoutes'),
      t('contingency.measureBoats'),
      t('contingency.measureDrills'),
      t('contingency.measureBuoys'),
    ],
    volcano: [
      t('contingency.measureGas'),
      t('contingency.measureZones'),
      t('contingency.measurePPE'),
      t('contingency.measureDrone'),
      t('contingency.measureShelter'),
    ],
  };
  return measures[hazard] || [];
}

export function ContingencyMeasures({ cell }: Props) {
  const t = useT();
  const [expanded, setExpanded] = useState<string | null>(null);
  const eq = cell.n_earthquakes ?? 0;
  const vol = cell.n_volcanoes ?? 0;
  const coastalTsunamiRisk = eq > 3;

  const hazards: ContingencyAction[] = [
    {
      hazard: t('contingency.hazardEarthquake'),
      warningWindow: getWarningWindow('earthquake', eq, t).window,
      priority: getWarningWindow('earthquake', eq, t).priority,
      icon: '🏚️',
      immediateActions: getImmediateActions('earthquake', eq, t),
      contingencyMeasures: getContingencyMeasures('earthquake', eq, t),
    },
    {
      hazard: t('contingency.hazardTsunami'),
      warningWindow: coastalTsunamiRisk ? t('contingency.warningWindowTsunami') : t('contingency.na'),
      priority: coastalTsunamiRisk ? 'critical' : 'low',
      icon: '🌊',
      immediateActions: coastalTsunamiRisk ? getImmediateActions('tsunami', 1, t) : [],
      contingencyMeasures: coastalTsunamiRisk ? getContingencyMeasures('tsunami', 1, t) : [],
    },
    {
      hazard: t('contingency.hazardVolcano'),
      warningWindow: getWarningWindow('volcano', vol, t).window,
      priority: getWarningWindow('volcano', vol, t).priority,
      icon: '🌋',
      immediateActions: getImmediateActions('volcano', vol, t),
      contingencyMeasures: getContingencyMeasures('volcano', vol, t),
    },
  ];

  const toggleExpand = (hazard: string) => {
    setExpanded((prev) => prev === hazard ? null : hazard);
  };

  return (
    <div className={styles.contingencySection}>
      {hazards.map((h) => {
        const hasEvents = h.hazard === t('contingency.hazardTsunami') ? coastalTsunamiRisk : true;
        if (!hasEvents) return null;
        const isExpanded = expanded === h.hazard;
        return (
          <div key={h.hazard} className={styles.contingencyCard}>
            <div className={styles.contingencyHeader} onClick={() => toggleExpand(h.hazard)}>
              <span className={styles.contingencyIcon}>{h.icon}</span>
              <div className={styles.contingencyInfo}>
                <span className={styles.contingencyName}>{h.hazard}</span>
                <span className={`${styles.contingencyWarning} ${styles[`priority_${h.priority}`]}`}>
                  {h.warningWindow}
                </span>
              </div>
              <span className={`${styles.contingencyBadge} ${styles[`badge_${h.priority}`]}`}>
                {h.priority.toUpperCase()}
              </span>
            </div>
            {isExpanded && (
              <>
                {h.immediateActions.length > 0 && (
                  <div className={styles.contingencyBlock}>
                    <span className={styles.contingencyBlockTitle}>🚨 {t('contingency.immediateResponse')}</span>
                    <ul className={styles.contingencyList}>
                      {h.immediateActions.map((a, i) => (
                        <li key={i} className={styles.contingencyListItem}>{a}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {h.contingencyMeasures.length > 0 && (
                  <div className={styles.contingencyBlock}>
                    <span className={styles.contingencyBlockTitle}>🛡️ {t('contingency.contingencyMeasures')}</span>
                    <ul className={styles.contingencyList}>
                      {h.contingencyMeasures.map((m, i) => (
                        <li key={i} className={styles.contingencyListItem}>{m}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
      {hazards.every((h) => {
        const key = h.hazard.toLowerCase().replace(' (if coastal)', '') as keyof RiskCell;
        return (cell[key] ?? 0) === 0;
      }) && (
        <div className={styles.contingencyEmpty}>
          <span className={styles.contingencyEmptyIcon}>✅</span>
          <span className={styles.contingencyEmptyText}>{t('contingency.empty')}</span>
        </div>
      )}
    </div>
  );
}