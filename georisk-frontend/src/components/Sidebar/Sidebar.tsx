import { useStore } from '../../store';
import { useRanking } from '../../hooks/useRanking';
import type { SidebarMode } from '../../types';
import { RankingTab } from './RankingTab';
import { FinancialTab } from './FinancialTab';
import { InsuranceTab } from './InsuranceTab';
import { AidTab } from './AidTab';
import { useT } from '../../i18n/LanguageContext';
import styles from './Sidebar.module.css';

export function Sidebar() {
  const { ui, setSidebarMode, toggleSidebar } = useStore();
  useRanking();
  const t = useT();
  const MODES: { key: SidebarMode; label: string; icon: string }[] = [
    { key: 'ranking', label: t('sidebar.ranking'), icon: '📊' },
    { key: 'financial', label: t('sidebar.financial'), icon: '💰' },
    { key: 'insurance', label: t('sidebar.insurance'), icon: '🛡️' },
    { key: 'aid', label: t('sidebar.aid'), icon: '🤝' },
  ];

  return (
    <aside className={`${styles.sidebar} ${!ui.sidebarOpen ? styles.hidden : ''}`}>
      <div className={styles.header}>
        <div className={styles.tabs}>
          {MODES.map((m) => (
            <button
              key={m.key}
              className={`${styles.tab} ${ui.sidebarMode === m.key ? styles.activeTab : ''}`}
              onClick={() => setSidebarMode(m.key)}
              title={m.label}
            >
              {m.icon}
            </button>
          ))}
        </div>
        <button className={styles.closeBtn} onClick={toggleSidebar}>{t('sidebar.close')}</button>
      </div>
      <div className={styles.content}>
        {ui.sidebarMode === 'ranking' && <RankingTab />}
        {ui.sidebarMode === 'financial' && <FinancialTab />}
        {ui.sidebarMode === 'insurance' && <InsuranceTab />}
        {ui.sidebarMode === 'aid' && <AidTab />}
      </div>
    </aside>
  );
}
