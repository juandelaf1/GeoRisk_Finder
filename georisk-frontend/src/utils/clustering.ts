export const clusterDescriptions: Record<number, { label: string; color: string }> = {
  0: { label: 'Very High Risk', color: '#A84B2F' },
  1: { label: 'High Risk', color: '#B37D00' },
  2: { label: 'Medium Risk', color: '#7A3B49' },
  3: { label: 'Low Risk', color: '#3A6B1E' },
  4: { label: 'Very Low Risk', color: '#01696F' },
};

export function getClusterInfo(cluster: number | undefined) {
  if (cluster === undefined || cluster === null) return { label: 'Unknown', color: '#6B6A64' };
  return clusterDescriptions[cluster] ?? { label: `Cluster ${cluster}`, color: '#6B6A64' };
}
