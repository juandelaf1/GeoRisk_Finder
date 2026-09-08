import type { RiskCell } from '../types';
import { getClusterProfile } from '../data/clusterProfiles';

export function explainCell(
  cell: RiskCell,
  ranking: RiskCell[]
): {
  riskStory: string;
  hazardBreakdown: { label: string; value: number; pct: number; color: string }[];
  economicContext: string;
} {
  const sorted = [...ranking].sort((a, b) => b.risk_score - a.risk_score);
  const rank = sorted.findIndex(
    (c) => c.cell_id === cell.cell_id || (c.lat === cell.lat && c.lon === cell.lon)
  );
  const percentile = ranking.length > 0
    ? Math.round((1 - (rank >= 0 ? rank : 0) / ranking.length) * 100)
    : 50;
  const displayRank = rank >= 0 ? rank + 1 : 0;
  const total = ranking.length;

  const cluster = getClusterProfile(cell.kmeans_cluster);
  const totalHazards = (cell.n_earthquakes ?? 0) + (cell.n_cyclones ?? 0) + (cell.n_volcanoes ?? 0);
  const eqPct = totalHazards > 0 ? Math.round(((cell.n_earthquakes ?? 0) / totalHazards) * 100) : 0;
  const cyPct = totalHazards > 0 ? Math.round(((cell.n_cyclones ?? 0) / totalHazards) * 100) : 0;
  const voPct = totalHazards > 0 ? Math.round(((cell.n_volcanoes ?? 0) / totalHazards) * 100) : 0;

  const riskStory =
    `This location ranks #${displayRank} of ${total} monitored cells ` +
    `(${percentile}th percentile) with a composite risk score of ${cell.risk_score.toFixed(3)}. ` +
    `It falls within the **${cluster.name}** (${cluster.nameShort}) cluster. ` +
    `The area has recorded ${cell.n_earthquakes ?? 0} earthquake events, ` +
    `${cell.n_cyclones ?? 0} cyclones, and ${cell.n_volcanoes ?? 0} volcanic incidents.`;

  const hazardBreakdown = [
    { label: 'Earthquakes', value: cell.n_earthquakes ?? 0, pct: eqPct, color: '#e74c3c' },
    { label: 'Cyclones', value: cell.n_cyclones ?? 0, pct: cyPct, color: '#3498db' },
    { label: 'Volcanoes', value: cell.n_volcanoes ?? 0, pct: voPct, color: '#e67e22' },
  ];

  const economicContext =
    cell.business && cell.business.trim().length > 0
      ? cell.business
      : 'No detailed economic impact data available for this location.';

  return { riskStory, hazardBreakdown, economicContext };
}
