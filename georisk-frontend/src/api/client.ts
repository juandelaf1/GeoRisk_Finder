import { fetchJSON } from '../utils/fetchJSON';
import type { RankedCell, LayerConfig, SearchResult, ViewState, ScenarioConfig, ActiveAlert, FinancialProjection, HazardEvent, TrendPoint } from '../types';

export async function fetchRanking(limit = 50, cluster?: number): Promise<RankedCell[]> {
  return fetchJSON<RankedCell[]>('/ranking', { limit, ...(cluster !== undefined ? { cluster } : {}) });
}

export async function fetchLayers(): Promise<{ layers: LayerConfig[]; view_state: ViewState }> {
  return fetchJSON('/layers');
}

export async function fetchSearch(q: string): Promise<SearchResult[]> {
  if (!q.trim()) return [];
  return fetchJSON<SearchResult[]>('/search', { q });
}

export async function fetchCellDetail(cellId: string): Promise<Record<string, unknown>> {
  return fetchJSON(`/cell/${cellId}`);
}

export async function fetchStats(): Promise<Record<string, number>> {
  return fetchJSON('/stats');
}

export async function fetchFinancial(): Promise<Record<string, unknown>[]> {
  return fetchJSON('/financial');
}

export async function fetchExplain(cellId: string): Promise<{ riskStory: string; hazardBreakdown: any[] }> {
  return fetchJSON(`/explain/${cellId}`);
}

export async function fetchCompare(cellA: string, cellB: string): Promise<any> {
  return fetchJSON('/compare', { cellA, cellB });
}

export async function fetchEconomic(cellId: string): Promise<any> {
  return fetchJSON(`/economic/${cellId}`);
}

export async function fetchAlerts(): Promise<ActiveAlert[]> {
  return fetchJSON<ActiveAlert[]>('/alerts');
}

export async function geoSearch(query: string): Promise<SearchResult[]> {
  return fetchJSON<SearchResult[]>('/search/geo', { q: query });
}

export async function fetchFinancialProjections(cellId: string, scenario?: string, year?: number): Promise<FinancialProjection[]> {
  const params: Record<string, string | number> = {};
  if (scenario) params.scenario = scenario;
  if (year) params.year = year;
  return fetchJSON<FinancialProjection[]>('/economic/' + cellId, params).then(d => Array.isArray(d) ? d : [d as unknown as FinancialProjection]).catch(() => []);
}

export async function fetchEvents(cellId: string): Promise<HazardEvent[]> {
  return fetchJSON<HazardEvent[]>('/events/' + cellId).catch(() => []);
}

export async function fetchScenarios(): Promise<ScenarioConfig[]> {
  return [
    { id: 'ssp126', label: 'SSP1-2.6', description: 'Sustainable — low emissions', color: '#16A34A' },
    { id: 'ssp245', label: 'SSP2-4.5', description: 'Intermediate — moderate emissions', color: '#2563EB' },
    { id: 'ssp370', label: 'SSP3-7.0', description: 'Regional rivalry — high emissions', color: '#EA580C' },
    { id: 'ssp585', label: 'SSP5-8.5', description: 'Fossil-fueled — extreme emissions', color: '#DC2626' },
  ];
}

export async function fetchProjectedLayers(year: number, scenario: string, signal?: AbortSignal): Promise<LayerConfig[]> {
  return fetchJSON<LayerConfig[]>('/layers/projected', { year, scenario }, 60000, signal);
}

export async function fetchTrends(metric: string, period: string = '12m'): Promise<{ metric: string; period: string; points: TrendPoint[] }> {
  return fetchJSON('/trends', { metric, period });
}

export async function executeAction(actionId: string, params: Record<string, unknown>): Promise<{ success: boolean }> {
  return fetchJSON('/action/execute', { action_id: actionId, ...params });
}
