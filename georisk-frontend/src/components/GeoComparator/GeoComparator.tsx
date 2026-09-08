import type { RiskCell } from '../../types';
import { useStore } from '../../store';
import { useT } from '../../i18n/LanguageContext';
import { ClusterBadge } from '../ui/ClusterBadge';
import styles from './GeoComparator.module.css';

interface Props {
  cellA: RiskCell | null;
  cellB: RiskCell | null;
}

function scoreColor(score: number): string {
  if (score < 0.3) return styles.scoreLow;
  if (score < 0.5) return styles.scoreModerate;
  if (score < 0.7) return styles.scoreHigh;
  return styles.scoreCritical;
}

function formatScore(score: number): string {
  return score.toFixed(2);
}

export function GeoComparator({ cellA, cellB }: Props) {
  const t = useT();
  const toggleCompare = useStore((s) => s.toggleCompare);
  const setCompareCell = useStore((s) => s.setCompareCell);

  if (!cellA && !cellB) return null;

  const swap = () => {
    setCompareCell('A', cellB);
    setCompareCell('B', cellA);
  };

  const renderCell = (cell: RiskCell | null, _label: string) => {
    if (!cell) {
      return (
        <div className={styles.placeholder}>
          {t('comparator.placeholder')}
        </div>
      );
    }
    return <CellView cell={cell} />;
  };

  const bothPresent = cellA && cellB;

  const getWinner = (a: number | undefined, b: number | undefined): 'A' | 'B' | null => {
    if (a === undefined || b === undefined || a === b) return null;
    return a < b ? 'A' : 'B';
  };

  const compareRow = (
    label: string,
    getValA: () => number | string | undefined,
    getValB: () => number | string | undefined,
    lowerIsBetter = true
  ) => {
    const valA = getValA();
    const valB = getValB();
    const aNum = typeof valA === 'number' ? valA : undefined;
    const bNum = typeof valB === 'number' ? valB : undefined;
    const win = lowerIsBetter ? getWinner(aNum, bNum) : aNum !== undefined && bNum !== undefined ? (aNum > bNum ? 'A' : aNum < bNum ? 'B' : null) : null;

    return (
      <div className={styles.row}>
        <span className={styles.rowHeader}>{label}</span>
        <span className={`${styles.cellA} ${win === 'A' ? styles.winner : win === 'B' ? styles.loser : ''}`}>
          {valA ?? t('comparator.na')}
        </span>
        <span className={`${styles.cellB} ${win === 'B' ? styles.winner : win === 'A' ? styles.loser : ''}`}>
          {valB ?? t('comparator.na')}
        </span>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>{t('comparator.title')}</span>
        <div className={styles.headerActions}>
          {bothPresent && (
            <button className={styles.button} onClick={swap}>
              {t('comparator.swap')}
            </button>
          )}
          <button className={styles.buttonClose} onClick={toggleCompare}>
            {t('comparator.close')}
          </button>
        </div>
      </div>

      <div className={styles.grid}>
        <div style={{ gridColumn: 2 }}>
          {renderCell(cellA, 'A')}
        </div>
        <div style={{ gridColumn: 3 }}>
          {renderCell(cellB, 'B')}
        </div>
      </div>

      <hr className={styles.divider} />

      {cellA && cellB && (
        <>
          {compareRow(t('comparator.riskScore'), () => cellA?.risk_score, () => cellB?.risk_score, true)}
          {compareRow(t('comparator.cluster'), () => cellA?.kmeans_cluster !== undefined ? `${cellA.kmeans_cluster}` : t('comparator.na'), () => cellB?.kmeans_cluster !== undefined ? `${cellB.kmeans_cluster}` : t('comparator.na'))}
          {compareRow(t('comparator.earthquakes'), () => cellA?.n_earthquakes ?? 0, () => cellB?.n_earthquakes ?? 0, true)}
          {compareRow(t('comparator.cyclones'), () => cellA?.n_cyclones ?? 0, () => cellB?.n_cyclones ?? 0, true)}
          {compareRow(t('comparator.volcanoes'), () => cellA?.n_volcanoes ?? 0, () => cellB?.n_volcanoes ?? 0, true)}
          {compareRow(t('comparator.economic'), () => cellA?.business ?? t('comparator.na'), () => cellB?.business ?? t('comparator.na'), false)}
          {compareRow(t('comparator.humanitarian'), () => cellA?.humanitarian ?? t('comparator.na'), () => cellB?.humanitarian ?? t('comparator.na'), false)}
        </>
      )}
    </div>
  );
}

function CellView({ cell }: { cell: RiskCell }) {
  const t = useT();
  return (
    <div>
      <div className={styles.row}>
        <span className={styles.rowHeader}>{t('comparator.score')}</span>
        <span className={`${styles.scoreValue} ${scoreColor(cell.risk_score)}`}>
          {formatScore(cell.risk_score)}
        </span>
      </div>
      <div className={styles.row}>
        <span className={styles.rowHeader}>{t('comparator.cluster')}</span>
        <ClusterBadge cluster={cell.kmeans_cluster} />
      </div>
      <div className={styles.row}>
        <span className={styles.rowHeader}>{t('comparator.location')}</span>
        <span>{cell.lat.toFixed(2)}°, {cell.lon.toFixed(2)}°</span>
      </div>
    </div>
  );
}
