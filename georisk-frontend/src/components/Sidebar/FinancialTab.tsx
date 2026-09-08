import { useEffect, useMemo, useState } from 'react';
import { fetchJSON } from '../../utils/fetchJSON';
import type { FinancialData } from '../../types';
import { useT } from '../../i18n/LanguageContext';
import styles from './Sidebar.module.css';

type RegionAgg = {
  name: string;
  gdp: number;
  exposure: number;
  risk: number;
  cells: FinancialData[];
};

export function FinancialTab() {
  const [data, setData] = useState<FinancialData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string>('');
  const t = useT();

  useEffect(() => {
    let cancelled = false;
    fetchJSON<FinancialData[]>('/financial')
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setData([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const regions = useMemo<RegionAgg[]>(() => {
    const byRegion = new Map<string, { gdp: number; exposure: number; risk: number; cells: FinancialData[] }>();
    for (const d of data) {
      const name = d.country || 'Unknown';
      if (!byRegion.has(name)) byRegion.set(name, { gdp: 0, exposure: 0, risk: 0, cells: [] });
      const g = byRegion.get(name)!;
      g.gdp += d.gdp;
      g.exposure += d.exposure;
      g.risk = Math.max(g.risk, d.risk_score);
      g.cells.push(d);
    }
    return Array.from(byRegion.entries())
      .map(([name, g]) => ({
        name,
        gdp: g.gdp,
        exposure: g.exposure / g.cells.length,
        risk: g.risk,
        cells: g.cells,
      }))
      .sort((a, b) => b.risk - a.risk)
      .slice(0, 15);
  }, [data]);

  if (loading) return <div className={styles.loading}>{t('financial.loading')}</div>;

  if (data.length === 0) {
    return (
      <>
        <div className={styles.sectionTitle}>{t('financial.title')}</div>
        <div className={styles.empty}>{t('financial.empty')}</div>
      </>
    );
  }

  const avgBCR = data.reduce((s, d) => s + d.ews_score / (d.risk_score || 0.01), 0) / data.length;

  return (
    <>
      <div className={styles.sectionTitle}>{t('financial.title')}</div>
      <div className={styles.kpiRow}>
        <div className={styles.kpi}>
          <span className={styles.kpiVal}>{regions.length}</span>
          <span className={styles.kpiLbl}>{t('financial.countries')}</span>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiVal}>{avgBCR.toFixed(1)}×</span>
          <span className={styles.kpiLbl}>{t('financial.avgBcr')}</span>
        </div>
      </div>
      <div className={styles.rankingList}>
        {regions.map((r) => {
          const open = expanded === r.name;
          return (
            <div
              key={r.name}
              className={styles.rankingItem}
              onClick={() => setExpanded(open ? '' : r.name)}
            >
              <div className={styles.pos}></div>
              <div style={{ flex: 1 }}>
                <div className={styles.name}>{r.name}</div>
                <div className={styles.factors}>
                  {t('financial.gdp')}{r.gdp.toFixed(1)}T {t('financial.exposure')} {(r.exposure * 100).toFixed(0)}% · {r.cells.length} {t('financial.cells')}
                </div>
                {open && (
                  <div className={styles.subList}>
                    {r.cells
                      .slice()
                      .sort((a, b) => b.risk_score - a.risk_score)
                      .map((c, i) => (
                        <div key={i} className={styles.subItem}>
                          <span className={styles.subName}>
                            {t('financial.gdp')}{c.gdp.toFixed(1)}T {t('financial.exposure')} {(c.exposure * 100).toFixed(0)}%
                          </span>
                          <span className={styles.subScore}>{Math.round(c.risk_score * 100)}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div
                  className={styles.score}
                  style={{ color: r.risk > 0.6 ? 'var(--color-terra)' : r.risk > 0.4 ? 'var(--color-gold)' : 'var(--color-success)' }}
                >
                  {Math.round(r.risk * 100)}
                </div>
                <div className={styles.factors}>{t('financial.risk')}</div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
