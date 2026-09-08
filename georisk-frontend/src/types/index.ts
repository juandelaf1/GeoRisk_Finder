export interface RiskCell {
  hexagon?: string;
  cell_id: string;
  lat: number;
  lon: number;
  risk_score: number;
  n_earthquakes: number;
  n_cyclones: number;
  n_volcanoes: number;
  kmeans_cluster?: number;
  dbscan_label?: number;
  cluster_color?: string;
  business?: string;
  humanitarian?: string;
  position?: [number, number];
  exposure?: number;
  h3_index?: string;
}

export interface LayerConfig {
  id: string;
  type: string;
  props: Record<string, unknown>;
  data: RiskCell[];
}

export interface ViewState {
  latitude: number;
  longitude: number;
  zoom: number;
  bearing?: number;
  pitch?: number;
}

export interface RankedCell extends RiskCell {
  rank?: number;
  region?: string;
}

export interface SearchResult {
  key: string;
  label: string;
  lat: number;
  lon: number;
}

export interface HazardFilters {
  earthquakes: boolean;
  cyclones: boolean;
  volcanoes: boolean;
  heatmap: boolean;
  hexagons: boolean;
  graticule: boolean;
  plates: boolean;
}

export type Basemap = 'dark' | 'light' | 'satellite';

export interface FinancialData {
  country: string;
  gdp: number;
  exposure: number;
  resilience: number;
  risk_score: number;
  ews_score: number;
}

export type SidebarMode = 'ranking' | 'financial' | 'insurance' | 'aid' | 'executive';

export interface ClusterProfile {
  id: number;
  name: string;
  nameShort: string;
  icon: string;
  color: string;
  description: string;
  businessInterpretation: string;
  humanitarianInterpretation: string;
  riskLevel: 'Low' | 'Moderate' | 'High' | 'Critical';
}

export interface DecisionCenterState {
  expandedSections: Record<string, boolean>;
}

export interface CompareState {
  active: boolean;
  cellA: RiskCell | null;
  cellB: RiskCell | null;
}

export interface TimelineState {
  year: number;
  playing: boolean;
}

export interface SearchState {
  query: string;
  results: SearchResult[];
  open: boolean;
}

export interface ExecutiveState {
  globalRiskMean: number;
  totalExposure: number;
  avgBCR: number;
  criticalRegionCount: number;
}

export interface HazardEvent {
  id: string;
  type: 'earthquake' | 'cyclone' | 'volcano' | 'flood';
  magnitude: number;
  date: string;
  distance: number;
  source: string;
  title: string;
}

export interface AlertAction {
  id: string;
  alertId: string;
  action: 'acknowledge' | 'escalate' | 'respond' | 'dismiss';
  timestamp: string;
  userId?: string;
}

export interface ActiveAlert {
  id: string;
  type: 'earthquake' | 'cyclone' | 'volcano' | 'flood';
  severity: 'info' | 'watch' | 'warning' | 'critical';
  title: string;
  location: string;
  lat: number;
  lon: number;
  timestamp: string;
  source: string;
}

export interface UIState {
  sidebarOpen: boolean;
  intelPanelOpen: boolean;
  selectedCell: RiskCell | null;
  sidebarMode: SidebarMode;
}

export interface TrendPoint {
  date: string;
  value: number;
}

export interface FinancialProjection {
  cellId: string;
  annualLoss: number;
  avoidedLoss: number;
  adaptationCost: number;
  netSavings: number;
  bcr: number;
  paybackYears: number;
  scenario: string;
  year: number;
}

export interface ScenarioConfig {
  id: string;
  label: string;
  description: string;
  color: string;
}

export interface ScenarioState {
  active: string;
  available: ScenarioConfig[];
}

export interface EventsState {
  events: HazardEvent[];
  selectedEvent: HazardEvent | null;
  loading: boolean;
}

export interface ActionsHistoryState {
  recent: AlertAction[];
  pending: number;
}

export interface AuthState {
  user: { email: string; role: string; name: string } | null;
  token: string | null;
  isAuthenticated: boolean;
  showAuthModal: boolean;
}

export interface ProjectedLayersState {
  year: number;
  scenario: string;
  layers: LayerConfig[];
  loading: boolean;
}

export interface StoreState {
  ranking: RankedCell[];
  layers: LayerConfig[];
  viewState: ViewState;
  filters: HazardFilters;
  basemap: Basemap;
  minRiskScore: number;
  selectedCluster: number | null;
  ui: UIState;
  loading: boolean;
  financialData: FinancialData[];
  decisionCenter: DecisionCenterState;
  compare: CompareState;
  timeline: TimelineState;
  search: SearchState;
  executive: ExecutiveState;
  financialProjections: FinancialProjection[];
  scenario: ScenarioState;
  events: EventsState;
  actionsHistory: ActionsHistoryState;
  projectedLayers: LayerConfig[];
  alerts: ActiveAlert[];
  auth: AuthState;

  setRanking: (data: RankedCell[]) => void;
  setLayers: (layers: LayerConfig[]) => void;
  setViewState: (vs: ViewState) => void;
  setFilters: (filters: Partial<HazardFilters>) => void;
  setBasemap: (basemap: Basemap) => void;
  setMinRiskScore: (score: number) => void;
  setSelectedCluster: (cluster: number | null) => void;
  setSelectedCell: (cell: RiskCell | null) => void;
  toggleSidebar: () => void;
  toggleIntelPanel: () => void;
  setSidebarMode: (mode: SidebarMode) => void;
  setLoading: (loading: boolean) => void;
  setFinancialData: (data: FinancialData[]) => void;

  setDecisionSection: (key: string, open: boolean) => void;
  setCompareCell: (slot: 'A' | 'B', cell: RiskCell | null) => void;
  toggleCompare: () => void;
  setTimelineYear: (year: number) => void;
  setTimelinePlaying: (playing: boolean) => void;
  openSearch: () => void;
  closeSearch: () => void;
  setSearchQuery: (q: string) => void;
  setSearchResults: (r: SearchResult[]) => void;
  setExecutiveData: (data: ExecutiveState) => void;
  setFinancialProjections: (data: FinancialProjection[]) => void;
  setScenario: (s: string) => void;
  setScenarioAvailable: (scenarios: ScenarioConfig[]) => void;
  setEvents: (events: HazardEvent[]) => void;
  setSelectedEvent: (e: HazardEvent | null) => void;
  addAction: (action: AlertAction) => void;
  setProjectedLayers: (layers: LayerConfig[]) => void;
  setAlerts: (alerts: ActiveAlert[]) => void;
  addAlert: (alert: ActiveAlert) => void;
  removeAlert: (id: string) => void;
  setAuth: (auth: Partial<AuthState>) => void;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  openAuthModal: () => void;
  closeAuthModal: () => void;
}


