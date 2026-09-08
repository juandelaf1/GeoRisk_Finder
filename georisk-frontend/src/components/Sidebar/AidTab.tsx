import { useMemo } from 'react';
import { useStore } from '../../store';
import { useT } from '../../i18n/LanguageContext';
import styles from './Sidebar.module.css';

export function AidTab() {
  const ranking = useStore((s) => s.ranking);
  const t = useT();

  const countryScores = useMemo(() => {
    const groups = new Map<string, { severities: number[]; count: number }>();
    for (const c of ranking) {
      const region = c.region || 'Unknown';
      if (!groups.has(region)) groups.set(region, { severities: [], count: 0 });
      const g = groups.get(region)!;
      g.severities.push(c.risk_score || 0);
      g.count++;
    }
    const scores = Array.from(groups.entries()).map(([name, g]) => {
      const meanSev = g.severities.reduce((a, b) => a + b, 0) / g.severities.length;
      const highRiskPct = g.severities.filter((s) => s > 0.6).length / g.severities.length;
      const priority = meanSev * 0.5 + highRiskPct * 0.3 + Math.min(g.count / 100, 1) * 0.2;
      return { name, priority: Math.round(priority * 100) / 100, severity: meanSev, cells: g.count };
    });
    return scores.sort((a, b) => b.priority - a.priority).slice(0, 15);
  }, [ranking]);

  const maxPriority = Math.max(...countryScores.map((c) => c.priority), 0.01);

  return (
    <>
      <div className={styles.sectionTitle}>{t('aid.title')}</div>
      <p className={styles.hint}>
        {t('aid.hint')}
      </p>
      <div className={styles.rankingList}>
        {countryScores.map((c, i) => {
          const pct = (c.priority / maxPriority) * 100;
          const barColor = pct > 70 ? 'var(--color-terra)' : pct > 40 ? 'var(--color-gold)' : 'var(--color-success)';
          return (
            <div key={c.name} className={styles.rankingItem}>
              <div className={styles.pos}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div className={styles.name}>{c.name}</div>
                <div className={styles.barOuter}>
                  <div className={styles.barInner} style={{ width: `${pct}%`, background: barColor }} />
                </div>
                <div className={styles.factors}>
                  {t('aid.priority')} {c.priority.toFixed(2)} {t('aid.severity')} {(c.severity * 100).toFixed(0)}% {t('aid.cells')} {c.cells}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
