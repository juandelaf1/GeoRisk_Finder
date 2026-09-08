import { create } from 'zustand';
import type { StoreState, RankedCell, LayerConfig, ViewState, HazardFilters, RiskCell, FinancialData, SidebarMode, SearchResult, ExecutiveState, FinancialProjection, ScenarioConfig, HazardEvent, AlertAction, ActiveAlert, AuthState, Basemap } from '../types';

const SCENARIOS: ScenarioConfig[] = [
  { id: 'ssp126', label: 'SSP1-2.6', description: 'Sustainable — low emissions', color: '#3A6B1E' },
  { id: 'ssp245', label: 'SSP2-4.5', description: 'Intermediate — moderate emissions', color: '#20808D' },
  { id: 'ssp370', label: 'SSP3-7.0', description: 'Regional rivalry — high emissions', color: '#B37D00' },
  { id: 'ssp585', label: 'SSP5-8.5', description: 'Fossil-fueled — extreme emissions', color: '#A84B2F' },
];

const initialState: StoreState = {
  ranking: [],
  layers: [],
  viewState: { latitude: 20, longitude: 0, zoom: 1.5, bearing: 0, pitch: 0 },
  filters: { earthquakes: true, cyclones: true, volcanoes: true, heatmap: false, hexagons: true, graticule: true, plates: true },
  basemap: 'light',
  minRiskScore: 0.3,
  selectedCluster: null,
  ui: {
    sidebarOpen: true,
    intelPanelOpen: false,
    selectedCell: null,
    sidebarMode: 'ranking',
  },
  loading: true,
  financialData: [],
  decisionCenter: { expandedSections: { risk: false, story: false, hazards: false, economic: false, actions: false, events: false, contingency: false } },
  compare: { active: false, cellA: null, cellB: null },
  timeline: { year: 2024, playing: false },
  search: { query: '', results: [], open: false },
  executive: { globalRiskMean: 0, totalExposure: 0, avgBCR: 0, criticalRegionCount: 0 },
  financialProjections: [],
  scenario: { active: 'ssp245', available: SCENARIOS },
  events: { events: [], selectedEvent: null, loading: false },
  actionsHistory: { recent: [], pending: 0 },
  projectedLayers: [],
  alerts: [],
  auth: {
    user: null,
    token: localStorage.getItem('georisk_token'),
    isAuthenticated: !!localStorage.getItem('georisk_token'),
    showAuthModal: false,
  },
  setRanking: () => {},
  setLayers: () => {},
  setViewState: () => {},
  setFilters: () => {},
  setBasemap: () => {},
  setMinRiskScore: () => {},
  setSelectedCluster: () => {},
  setSelectedCell: () => {},
  toggleSidebar: () => {},
  toggleIntelPanel: () => {},
  setSidebarMode: () => {},
  setLoading: () => {},
  setFinancialData: () => {},
  setDecisionSection: () => {},
  setCompareCell: () => {},
  toggleCompare: () => {},
  setTimelineYear: () => {},
  setTimelinePlaying: () => {},
  openSearch: () => {},
  closeSearch: () => {},
  setSearchQuery: () => {},
  setSearchResults: () => {},
  setExecutiveData: () => {},
  setFinancialProjections: () => {},
  setScenario: () => {},
  setScenarioAvailable: () => {},
  setEvents: () => {},
  setSelectedEvent: () => {},
  addAction: () => {},
  setProjectedLayers: () => {},

  setAlerts: () => {},
  addAlert: () => {},
  removeAlert: () => {},
  setAuth: () => {},
  login: async () => false,
  logout: () => {},
  openAuthModal: () => {},
  closeAuthModal: () => {},
};

export const useStore = create<StoreState>((set) => ({
  ...initialState,

  setRanking: (data: RankedCell[]) => set({ ranking: data }),
  setLayers: (layers: LayerConfig[]) => set({ layers }),
  setViewState: (vs: ViewState) => set({ viewState: vs }),

  setFilters: (filters: Partial<HazardFilters>) =>
    set((state) => ({ filters: { ...state.filters, ...filters } })),

  setBasemap: (basemap: Basemap) => set({ basemap }),

  setMinRiskScore: (score: number) => set({ minRiskScore: score }),
  setSelectedCluster: (cluster: number | null) => set({ selectedCluster: cluster }),

  setSelectedCell: (cell: RiskCell | null) =>
    set((state) => ({
      selectedCell: cell,
      ui: { ...state.ui, selectedCell: cell, intelPanelOpen: cell !== null },
    })),

  toggleSidebar: () =>
    set((state) => ({ ui: { ...state.ui, sidebarOpen: !state.ui.sidebarOpen } })),

  toggleIntelPanel: () =>
    set((state) => ({ ui: { ...state.ui, intelPanelOpen: !state.ui.intelPanelOpen } })),

  setSidebarMode: (mode: SidebarMode) =>
    set((state) => ({ ui: { ...state.ui, sidebarMode: mode, sidebarOpen: true } })),

  setLoading: (loading: boolean) => set({ loading }),
  setFinancialData: (data: FinancialData[]) => set({ financialData: data }),

  setDecisionSection: (key: string, open: boolean) =>
    set((state) => ({
      decisionCenter: {
        ...state.decisionCenter,
        expandedSections: { ...state.decisionCenter.expandedSections, [key]: open },
      },
    })),

  setCompareCell: (slot: 'A' | 'B', cell: RiskCell | null) =>
    set((state) => ({
      compare: { ...state.compare, [slot === 'A' ? 'cellA' : 'cellB']: cell },
    })),

  toggleCompare: () =>
    set((state) => ({ compare: { ...state.compare, active: !state.compare.active } })),

  setTimelineYear: (year: number) =>
    set((state) => ({ timeline: { ...state.timeline, year } })),

  setTimelinePlaying: (playing: boolean) =>
    set((state) => ({ timeline: { ...state.timeline, playing } })),

  openSearch: () => set((state) => ({ search: { ...state.search, open: true } })),
  closeSearch: () => set((state) => ({ search: { ...state.search, open: false, query: '', results: [] } })),

  setSearchQuery: (q: string) =>
    set((state) => ({ search: { ...state.search, query: q } })),

  setSearchResults: (results: SearchResult[]) =>
    set((state) => ({ search: { ...state.search, results } })),

  setExecutiveData: (data: ExecutiveState) => set({ executive: data }),

  setFinancialProjections: (data: FinancialProjection[]) => set({ financialProjections: data }),

  setScenario: (s: string) =>
    set((state) => ({ scenario: { ...state.scenario, active: s } })),

  setScenarioAvailable: (scenarios: ScenarioConfig[]) =>
    set((state) => ({ scenario: { ...state.scenario, available: scenarios } })),

  setEvents: (events: HazardEvent[]) =>
    set((state) => ({ events: { ...state.events, events, loading: false } })),

  setSelectedEvent: (selectedEvent: HazardEvent | null) =>
    set((state) => ({ events: { ...state.events, selectedEvent } })),

  addAction: (action: AlertAction) =>
    set((state) => ({
      actionsHistory: {
        recent: [action, ...state.actionsHistory.recent].slice(0, 50),
        pending: state.actionsHistory.pending + (action.action === 'acknowledge' ? -1 : 1),
      },
    })),

  setProjectedLayers: (layers: LayerConfig[]) => set({ projectedLayers: layers }),

  setAlerts: (alerts: ActiveAlert[]) => set({ alerts }),

  addAlert: (alert: ActiveAlert) =>
    set((state) => ({
      alerts: [alert, ...state.alerts.filter(a => a.id !== alert.id)].slice(0, 100),
    })),

  removeAlert: (id: string) =>
    set((state) => ({
      alerts: state.alerts.filter(a => a.id !== id),
    })),

  setAuth: (partial: Partial<AuthState>) =>
    set((state) => ({ auth: { ...state.auth, ...partial } })),

  login: async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      localStorage.setItem('georisk_token', data.token);
      set({ auth: { user: data.user, token: data.token, isAuthenticated: true, showAuthModal: false } });
      return true;
    } catch {
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('georisk_token');
    set({ auth: { user: null, token: null, isAuthenticated: false, showAuthModal: false } });
  },

  openAuthModal: () => set((state) => ({ auth: { ...state.auth, showAuthModal: true } })),

  closeAuthModal: () => set((state) => ({ auth: { ...state.auth, showAuthModal: false } })),
}));
