import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../store'

describe('useStore', () => {
  beforeEach(() => {
    useStore.setState({
      ranking: [],
      layers: [],
      viewState: { latitude: 20, longitude: 0, zoom: 1.5, bearing: 0, pitch: 0 },
      filters: { earthquakes: true, cyclones: true, volcanoes: true, heatmap: false, hexagons: true, graticule: true, plates: true },
      basemap: 'light',
      minRiskScore: 0.3,
      selectedCluster: null,
      ui: { sidebarOpen: true, intelPanelOpen: false, selectedCell: null, sidebarMode: 'ranking' },
      loading: true,
      financialData: [],
      decisionCenter: { expandedSections: { risk: false, story: false, hazards: false, economic: false, actions: false, events: false, contingency: false } },
      compare: { active: false, cellA: null, cellB: null },
      timeline: { year: 2024, playing: false },
      search: { query: '', results: [], open: false },
      executive: { globalRiskMean: 0, totalExposure: 0, avgBCR: 0, criticalRegionCount: 0 },
      financialProjections: [],
      scenario: { active: 'ssp245', available: [] },
      events: { events: [], selectedEvent: null, loading: false },
      actionsHistory: { recent: [], pending: 0 },
      projectedLayers: [],
      alerts: [],
      auth: { user: null, token: null, isAuthenticated: false, showAuthModal: false },
    })
  })

  it('has correct initial state', () => {
    const state = useStore.getState()
    expect(state.ranking).toEqual([])
    expect(state.layers).toEqual([])
    expect(state.viewState).toEqual({ latitude: 20, longitude: 0, zoom: 1.5, bearing: 0, pitch: 0 })
    expect(state.ui.sidebarOpen).toBe(true)
    expect(state.ui.sidebarMode).toBe('ranking')
    expect(state.loading).toBe(true)
    expect(state.scenario.active).toBe('ssp245')
    expect(state.timeline.year).toBe(2024)
    expect(state.auth.isAuthenticated).toBe(false)
  })

  it('setRanking updates ranking', () => {
    const cells = [{ cell_id: 'a', lat: 1, lon: 2, risk_score: 0.5, n_earthquakes: 1, n_cyclones: 0, n_volcanoes: 0 }]
    useStore.getState().setRanking(cells as any)
    expect(useStore.getState().ranking).toEqual(cells)
  })

  it('setLayers updates layers', () => {
    const layers = [{ id: 'test', type: 'scatter', props: {}, data: [] }]
    useStore.getState().setLayers(layers as any)
    expect(useStore.getState().layers).toEqual(layers)
  })

  it('setViewState updates viewState', () => {
    const vs = { latitude: 10, longitude: 20, zoom: 3 }
    useStore.getState().setViewState(vs)
    expect(useStore.getState().viewState).toEqual(vs)
  })

  it('toggleSidebar toggles sidebarOpen', () => {
    expect(useStore.getState().ui.sidebarOpen).toBe(true)
    useStore.getState().toggleSidebar()
    expect(useStore.getState().ui.sidebarOpen).toBe(false)
    useStore.getState().toggleSidebar()
    expect(useStore.getState().ui.sidebarOpen).toBe(true)
  })

  it('setSidebarMode updates mode and opens sidebar', () => {
    useStore.setState({ ui: { ...useStore.getState().ui, sidebarOpen: false } })
    useStore.getState().setSidebarMode('financial')
    expect(useStore.getState().ui.sidebarMode).toBe('financial')
    expect(useStore.getState().ui.sidebarOpen).toBe(true)
  })

  it('setSelectedCell updates ui.selectedCell and opens intelPanel', () => {
    const cell = { cell_id: 'test', lat: 0, lon: 0, risk_score: 0.1, n_earthquakes: 0, n_cyclones: 0, n_volcanoes: 0 }
    useStore.getState().setSelectedCell(cell as any)
    expect(useStore.getState().ui.selectedCell).toEqual(cell)
    expect(useStore.getState().ui.intelPanelOpen).toBe(true)
  })

  it('setSelectedCell with null closes intelPanel', () => {
    useStore.getState().setSelectedCell(null)
    expect(useStore.getState().ui.selectedCell).toBeNull()
    expect(useStore.getState().ui.intelPanelOpen).toBe(false)
  })

  it('setFinancialData updates financialData', () => {
    const data = [{ country: 'X', gdp: 1, exposure: 2, resilience: 3, risk_score: 0.4, ews_score: 0.5 }]
    useStore.getState().setFinancialData(data as any)
    expect(useStore.getState().financialData).toEqual(data)
  })

  it('setScenario updates scenario.active', () => {
    useStore.getState().setScenario('ssp585')
    expect(useStore.getState().scenario.active).toBe('ssp585')
  })

  it('setTimelineYear updates timeline.year', () => {
    useStore.getState().setTimelineYear(2050)
    expect(useStore.getState().timeline.year).toBe(2050)
  })

  it('login sets auth state', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'abc', user: { email: 'a@b.com', role: 'admin', name: 'A' } }),
    })
    const result = await useStore.getState().login('a@b.com', 'pass')
    expect(result).toBe(true)
    expect(useStore.getState().auth.isAuthenticated).toBe(true)
    expect(useStore.getState().auth.token).toBe('abc')
    expect(useStore.getState().auth.user?.email).toBe('a@b.com')
    globalThis.fetch = originalFetch
  })

  it('login returns false on failure', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false })
    const result = await useStore.getState().login('a@b.com', 'wrong')
    expect(result).toBe(false)
    expect(useStore.getState().auth.isAuthenticated).toBe(false)
    globalThis.fetch = originalFetch
  })

  it('logout clears auth state', () => {
    useStore.setState({ auth: { user: { email: 'a@b.com', role: 'admin', name: 'A' }, token: 'abc', isAuthenticated: true, showAuthModal: false } })
    useStore.getState().logout()
    expect(useStore.getState().auth.isAuthenticated).toBe(false)
    expect(useStore.getState().auth.token).toBeNull()
    expect(useStore.getState().auth.user).toBeNull()
  })

  it('addAlert adds to alerts list', () => {
    const alert = { id: '1', type: 'earthquake' as const, severity: 'warning' as const, title: 'Test', location: 'Here', lat: 0, lon: 0, timestamp: '', source: 'test' }
    useStore.getState().addAlert(alert)
    expect(useStore.getState().alerts).toHaveLength(1)
    expect(useStore.getState().alerts[0].id).toBe('1')
  })

  it('addAlert deduplicates by id', () => {
    const alert = { id: '1', type: 'earthquake' as const, severity: 'warning' as const, title: 'Test', location: 'Here', lat: 0, lon: 0, timestamp: '', source: 'test' }
    useStore.getState().addAlert(alert)
    useStore.getState().addAlert({ ...alert, title: 'Updated' })
    expect(useStore.getState().alerts).toHaveLength(1)
    expect(useStore.getState().alerts[0].title).toBe('Updated')
  })

  it('removeAlert removes from alerts list', () => {
    const alert1 = { id: '1', type: 'earthquake' as const, severity: 'warning' as const, title: 'T1', location: '', lat: 0, lon: 0, timestamp: '', source: '' }
    const alert2 = { id: '2', type: 'flood' as const, severity: 'info' as const, title: 'T2', location: '', lat: 0, lon: 0, timestamp: '', source: '' }
    useStore.getState().addAlert(alert1)
    useStore.getState().addAlert(alert2)
    useStore.getState().removeAlert('1')
    expect(useStore.getState().alerts).toHaveLength(1)
    expect(useStore.getState().alerts[0].id).toBe('2')
  })

  it('setAlerts replaces alerts list', () => {
    const alert1 = { id: '1', type: 'earthquake' as const, severity: 'warning' as const, title: 'T1', location: '', lat: 0, lon: 0, timestamp: '', source: '' }
    useStore.getState().addAlert(alert1)
    const newAlerts = [{ id: '3', type: 'volcano' as const, severity: 'critical' as const, title: 'T3', location: '', lat: 0, lon: 0, timestamp: '', source: '' }]
    useStore.getState().setAlerts(newAlerts as any)
    expect(useStore.getState().alerts).toHaveLength(1)
    expect(useStore.getState().alerts[0].id).toBe('3')
  })

  it('setFilters updates partial filters', () => {
    useStore.getState().setFilters({ earthquakes: false, heatmap: true })
    expect(useStore.getState().filters.earthquakes).toBe(false)
    expect(useStore.getState().filters.heatmap).toBe(true)
    expect(useStore.getState().filters.cyclones).toBe(true)
  })

  it('setMinRiskScore updates score', () => {
    useStore.getState().setMinRiskScore(0.7)
    expect(useStore.getState().minRiskScore).toBe(0.7)
  })

  it('toggleCompare toggles compare.active', () => {
    expect(useStore.getState().compare.active).toBe(false)
    useStore.getState().toggleCompare()
    expect(useStore.getState().compare.active).toBe(true)
  })

  it('setCompareCell sets cell in correct slot', () => {
    const cell = { cell_id: 'a', lat: 0, lon: 0, risk_score: 0.1, n_earthquakes: 0, n_cyclones: 0, n_volcanoes: 0 }
    useStore.getState().setCompareCell('A', cell as any)
    expect(useStore.getState().compare.cellA).toEqual(cell)
    useStore.getState().setCompareCell('B', cell as any)
    expect(useStore.getState().compare.cellB).toEqual(cell)
  })

  it('setDecisionSection updates expanded sections', () => {
    useStore.getState().setDecisionSection('risk', true)
    expect(useStore.getState().decisionCenter.expandedSections.risk).toBe(true)
    useStore.getState().setDecisionSection('risk', false)
    expect(useStore.getState().decisionCenter.expandedSections.risk).toBe(false)
  })
})
