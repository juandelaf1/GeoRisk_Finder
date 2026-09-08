export function normalizeRiskScore(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  return (value - min) / (max - min);
}

export function riskScoreToColor(score: number): string {
  const hue = Math.round((1 - Math.min(1, Math.max(0, score))) * 120);
  return `hsl(${hue}, 80%, 55%)`;
}

export function formatNumber(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}

export function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.slice(0, len) + '...';
}
