import { useT } from '../../i18n/LanguageContext';
import { useToast } from '../ui/Toast';
import type { RiskCell } from '../../types';
import { useStore } from '../../store';
import { fetchJSON } from '../../utils/fetchJSON';
import { useRef } from 'react';
import { icons } from './actionIcons';
import styles from './DecisionCenter.module.css';

interface Props {
  cell: RiskCell;
}

export function ActionBar({ cell }: Props) {
  const t = useT();
  const toastCtx = useToast();
  const toast = toastCtx.showToast;
  const toggleCompare = useStore((s) => s.toggleCompare);
  const store = useStore;
  const lastAction = useRef<string | null>(null);

  const actions = [
    {
      id: 'export',
      label: t('actionBar.export'),
      icon: icons.export,
      priority: 'primary' as const,
      handler: () => {
        lastAction.current = 'export';
        const cellId = cell.cell_id || `${cell.lat.toFixed(4)}-${cell.lon.toFixed(4)}`;
        window.open(`/api/report/${cellId}`, '_blank');
        store.getState().addAction({
          id: `action-${Date.now()}`,
          alertId: cellId,
          action: 'respond',
          timestamp: new Date().toISOString(),
        });
        toast(t('actionBar.export') + ' \u2713', 'success');
      },
    },
    {
      id: 'monitor',
      label: t('actionBar.monitor'),
      icon: icons.monitor,
      priority: 'secondary' as const,
      handler: () => {
        lastAction.current = 'monitor';
        store.getState().addAction({
          id: `action-${Date.now()}`,
          alertId: cell.cell_id ?? 'unknown',
          action: 'acknowledge',
          timestamp: new Date().toISOString(),
        });
        fetchJSON('/action/execute', { cell_id: cell.cell_id ?? '', action: 'monitor' })
          .then(() => toast(t('actionBar.monitor') + ' \u2713', 'success'))
          .catch(() => toast(t('actionBar.monitor') + ' \u2717', 'error'));
      },
    },
    {
      id: 'compare',
      label: t('actionBar.compare'),
      icon: icons.compare,
      priority: 'secondary' as const,
      handler: () => {
        lastAction.current = 'compare';
        toggleCompare();
        store.getState().addAction({
          id: `action-${Date.now()}`,
          alertId: cell.cell_id ?? 'unknown',
          action: 'acknowledge',
          timestamp: new Date().toISOString(),
        });
        toast(t('actionBar.compare') + ' \u2713', 'info');
      },
    },
    {
      id: 'alert',
      label: t('actionBar.alert'),
      icon: icons.alert,
      priority: 'secondary' as const,
      handler: () => {
        lastAction.current = 'alert';
        store.getState().addAction({
          id: `action-${Date.now()}`,
          alertId: cell.cell_id ?? 'unknown',
          action: 'escalate',
          timestamp: new Date().toISOString(),
        });
        fetchJSON('/action/execute', { cell_id: cell.cell_id ?? '', action: 'alert_team' })
          .then(() => toast(t('actionBar.alert') + ' \u2713', 'success'))
          .catch(() => toast(t('actionBar.alert') + ' \u2717', 'error'));
      },
    },
    {
      id: 'business',
      label: t('actionBar.businessCase'),
      icon: icons.business,
      priority: 'secondary' as const,
      handler: () => {
        lastAction.current = 'business';
        store.getState().addAction({
          id: `action-${Date.now()}`,
          alertId: cell.cell_id ?? 'unknown',
          action: 'respond',
          timestamp: new Date().toISOString(),
        });
        fetchJSON('/action/execute', { cell_id: cell.cell_id ?? '', action: 'business_case' })
          .then(() => toast(t('actionBar.businessCase') + ' \u2713', 'success'))
          .catch(() => toast(t('actionBar.businessCase') + ' \u2717', 'error'));
      },
    },
  ];

  return (
    <div className={styles.actionBar}>
      {actions.map((a) => (
        <button
          key={a.id}
          className={`${styles.actionBtn} ${a.priority === 'primary' ? styles.actionBtnPrimary : styles.actionBtnSecondary}`}
          onClick={a.handler}
          title={a.label}
        >
          <span>{a.icon}</span>
          <span>{a.label}</span>
        </button>
      ))}
    </div>
  );
}
