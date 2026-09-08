import { useMemo, useState } from 'react';
import { useStore } from '../../store';
import type { RankedCell } from '../../types';
import { useT } from '../../i18n/LanguageContext';
import styles from './Sidebar.module.css';

type RegionAgg = {
  name: string;
  avgRelative: number;
  loss: number;
  cells: RankedCell[];
};

export function InsuranceTab() {
  const ranking = useStore((s) => s.ranking);
  const selectedCell = useStore((s) => s.ui.selectedCell);
  const setSelectedCell = useStore((s) => s.setSelectedCell);
  const t = useT();
  const [expanded, setExpanded] = useState<string>('');

  const globalMean = ranking.length
    ? ranking.reduce((s, c) => s + (c.risk_score || 0), 0) / ranking.length
    : 1;

  const regions = useMemo<RegionAgg[]>(() => {
    const byRegion = new Map<string, { rels: number[]; loss: number; cells: typeof ranking }>();
    for (const c of ranking) {
      const name = c.region || 'Unknown';
      if (!byRegion.has(name)) byRegion.set(name, { rels: [], loss: 0, cells: [] });
      const g = byRegion.get(name)!;
      const relative = globalMean > 0 ? (c.risk_score || 0) / globalMean : 1;
      g.rels.push(relative);
      g.loss += (c.risk_score || 0) * 50000;
      g.cells.push(c);
    }
    return Array.from(byRegion.entries())
      .map(([name, g]) => ({
        name,
        avgRelative: g.rels.reduce((a, b) => a + b, 0) / g.rels.length,
        loss: g.loss,
        cells: g.cells,
      }))
      .sort((a, b) => b.avgRelative - a.avgRelative)
      .slice(0, 15);
  }, [ranking, globalMean]);

  const classify = (rel: number, hasOutlier: boolean) => {
    if (hasOutlier) return t('insurance.manualReview');
    if (rel > 2) return t('insurance.highPremium');
    return t('insurance.standard');
  };

  return (
    <>
      <div className={styles.sectionTitle}>{t('insurance.title')}</div>
      <p className={styles.hint}>{t('insurance.hint')}</p>
      <div className={styles.rankingList}>
        {regions.map((r) => {
          const open = expanded === r.name;
          const hasOutlier = r.cells.some((c) => c.dbscan_label === -1);
          const classification = classify(r.avgRelative, hasOutlier);
          return (
            <div
              key={r.name}
              className={styles.rankingItem}
              onClick={() => setExpanded(open ? '' : r.name)}
            >
              <div className={styles.pos}></div>
              <div style={{ flex: 1 }}>
                <div className={styles.name}>
                  {r.name}
                  <span className={styles.factors}>{r.cells.length} {t('insurance.cells')}</span>
                </div>
                <div className={styles.factors}>
                  {t('insurance.premium')} {r.avgRelative.toFixed(2)}× {t('insurance.loss')}{(r.loss / 1000000).toFixed(1)}M
                </div>
                <div className={styles.factors}>{classification}</div>
                {open && (
                  <div className={styles.subList}>
                    {r.cells
                      .slice()
                      .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))
                      .map((c, i) => {
                        const rel = globalMean > 0 ? (c.risk_score || 0) / globalMean : 1;
                        const isSelected = selectedCell?.cell_id === c.cell_id;
                        return (
                          <div
                            key={c.cell_id || i}
                            className={`${styles.subItem} ${isSelected ? styles.active : ''}`}
                            onClick={(e) => { e.stopPropagation(); setSelectedCell(c); }}
                          >
                            <span className={styles.subName}>
                              {(c.cell_id || '').slice(0, 8)} · {t('insurance.premium')} {rel.toFixed(2)}×
                            </span>
                            <span className={styles.subScore}>
                              {t('insurance.loss')}{((c.risk_score || 0) * 50000 / 1000).toFixed(0)}K
                            </span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
