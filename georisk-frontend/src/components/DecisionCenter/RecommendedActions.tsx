import { useT } from '../../i18n/LanguageContext';
import type { RiskCell } from '../../types';
import styles from './DecisionCenter.module.css';

interface Props {
  cell: RiskCell;
}

interface Action {
  priority: 'high' | 'medium' | 'low';
  title: string;
  reason: string;
}

function deriveActions(cell: RiskCell, t: ReturnType<typeof useT>): Action[] {
  const actions: Action[] = [];
  const eq = cell.n_earthquakes ?? 0;
  const cyc = cell.n_cyclones ?? 0;
  const vol = cell.n_volcanoes ?? 0;

  if (eq > 5) {
    actions.push({
      priority: 'high',
      title: t('actions.seismicRetrofit'),
      reason: t('actions.seismicRetrofitReason', { eq: String(eq) }),
    });
  } else if (eq > 0) {
    actions.push({
      priority: 'medium',
      title: t('actions.seismicEval'),
      reason: t('actions.seismicEvalReason', { eq: String(eq) }),
    });
  }

  if (cyc > 5) {
    actions.push({
      priority: 'high',
      title: t('actions.cyclonePlan'),
      reason: t('actions.cyclonePlanReason', { cyc: String(cyc) }),
    });
  } else if (cyc > 0) {
    actions.push({
      priority: 'medium',
      title: t('actions.cycloneMonitor'),
      reason: t('actions.cycloneMonitorReason', { cyc: String(cyc) }),
    });
  }

  if (vol > 2) {
    actions.push({
      priority: 'high',
      title: t('actions.volcanoMitigation'),
      reason: t('actions.volcanoMitigationReason', { vol: String(vol) }),
    });
  } else if (vol > 0) {
    actions.push({
      priority: 'low',
      title: t('actions.volcanoAwareness'),
      reason: t('actions.volcanoAwarenessReason', { vol: String(vol) }),
    });
  }

  if ((cell.risk_score ?? 0) > 0.7) {
    actions.push({
      priority: 'high',
      title: t('actions.comprehensiveAssessment'),
      reason: t('actions.comprehensiveReason'),
    });
  }

  if (actions.length === 0) {
    actions.push({
      priority: 'low',
      title: t('actions.routineMonitoring'),
      reason: t('actions.routineReason'),
    });
  }

  return actions.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.priority] - order[b.priority];
  });
}

const priorityIcon: Record<string, string> = {
  high: '🔴',
  medium: '🟡',
  low: '🟢',
};

export function RecommendedActions({ cell }: Props) {
  const t = useT();
  const actions = deriveActions(cell, t);

  return (
    <div className={styles.actionsSection}>
      {actions.map((a, i) => (
        <div key={i} className={`${styles.actionItem} ${styles[`priority_${a.priority}`]}`}>
          <span className={styles.actionIcon}>{priorityIcon[a.priority]}</span>
          <div className={styles.actionContent}>
            <span className={styles.actionTitle}>{a.title}</span>
            <span className={styles.actionReason}>{a.reason}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
