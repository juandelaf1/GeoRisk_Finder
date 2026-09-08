import { Deck } from '@deck.gl/core';
import { H3HexagonLayer, TileLayer } from '@deck.gl/geo-layers';
import { ScatterplotLayer, PathLayer, TextLayer, BitmapLayer } from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { _GlobeView } from '@deck.gl/core';
import { geoToH3 } from 'h3-js';
import { useStore } from '../../store';
import type { LayerConfig, ViewState, RiskCell } from '../../types';

let currentDeck: Deck | null = null;

const INITIAL_VIEW: ViewState = {
  latitude: 20, longitude: 0, zoom: 1.5, bearing: 0, pitch: 0,
};

let lastH3Data: RiskCell[] = [];

export function flyTo(vs: Partial<ViewState>) {
  if (!currentDeck) return;
  const merged = { ...((currentDeck as any).viewState as ViewState), ...vs };
  merged.zoom = Math.max(1, Math.min(5, merged.zoom ?? 1.5));
  (currentDeck as any).setProps({ viewState: merged });
}

function snapToNearestCell(lat: number, lon: number): RiskCell | null {
  if (lastH3Data.length === 0) return null;
  const index = geoToH3(lat, lon, 3);
  const exact = lastH3Data.find((d) => d.h3_index === index || d.cell_id === index || d.hexagon === index);
  if (exact) return exact;
  let best: RiskCell | null = null;
  let bestDist = Infinity;
  for (const d of lastH3Data) {
    const dx = (d.lat - lat) ** 2;
    const dy = (d.lon - lon) ** 2;
    const dist = dx + dy;
    if (dist < bestDist) {
      bestDist = dist;
      best = d;
    }
  }
  return best;
}

function handleGlobeClick(info: any, event: any) {
  if (info?.object && (info.object.cell_id || info.object.hexagon || info.object.h3_index)) {
    const cell = info.object as RiskCell;
    useStore.getState().setSelectedCell(cell);
    flyTo({ latitude: cell.lat, longitude: cell.lon, zoom: 5, bearing: 0, pitch: 0 });
    return;
  }
  const viewport = currentDeck?.getViewports()[0];
  if (!viewport) return;
  let coord: number[] | null = null;
  try {
    coord = info?.coordinate || viewport.unproject([event.offsetX, event.offsetY]);
  } catch {
    coord = null;
  }
  if (!coord || coord.length < 2) return;
  const [lon, lat] = coord;
  const cell = snapToNearestCell(lat, lon);
  if (cell) {
    useStore.getState().setSelectedCell(cell);
    flyTo({ latitude: cell.lat, longitude: cell.lon, zoom: 5, bearing: 0, pitch: 0 });
  }
}

function getTooltipInfo(info: any): { html: string; style: Record<string, string> } | null {
  if (!info?.object) return null;
  const d = info.object;
  if (!d.cell_id && !d.hexagon && !d.h3_index) return null;

  const score = (d.risk_score || 0).toFixed(2);
  const cluster = d.kmeans_cluster !== undefined ? `Cluster ${d.kmeans_cluster}` : '';
  const scoreColor = d.risk_score >= 0.7 ? '#EF4444' : d.risk_score >= 0.4 ? '#F59E0B' : '#22C55E';
  const cellId = (d.cell_id || d.hexagon || d.h3_index || '').slice(0, 10);
  const eq = d.n_earthquakes || 0;
  const cyc = d.n_cyclones || 0;
  const vol = d.n_volcanoes || 0;

  return {
    html: `<div style="font-family:system-ui;font-size:12px;padding:4px 0">
      <div style="font-weight:700;margin-bottom:4px">
        <span style="color:${scoreColor};font-size:14px">${score}</span>
        ${cluster ? `<span style="opacity:0.6;margin-left:6px;font-size:11px">${cluster}</span>` : ''}
      </div>
      <div style="opacity:0.7;font-size:11px;margin-bottom:3px">${cellId}...</div>
      <div style="display:flex;gap:8px;font-size:11px;opacity:0.8">
        <span>EQ:${eq}</span><span>CYC:${cyc}</span><span>VOL:${vol}</span>
      </div>
    </div>`,
    style: {
      backgroundColor: 'rgba(13, 27, 42, 0.92)',
      color: '#fff',
      borderRadius: '6px',
      padding: '8px 12px',
      border: '1px solid rgba(255,255,255,0.12)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
      zIndex: '9999',
      maxWidth: '220px',
    },
  };
}

export function createGlobe(container: HTMLDivElement) {
  const deck = new Deck({
    width: '100%',
    height: '100%',
    parent: container,
    views: [new _GlobeView({ id: 'globe', resolution: 10, controller: true })],
    initialViewState: INITIAL_VIEW,
    parameters: { clearColor: [6, 24, 64, 255] } as any,
    getCursor: ({ isDragging }: { isDragging: boolean }) => isDragging ? 'grabbing' : 'default',
    onViewStateChange: ({ viewState }: { viewState: Record<string, unknown> }) => {
      const vs = viewState as unknown as ViewState;
      vs.zoom = Math.max(1, Math.min(5, vs.zoom ?? 1.5));
      useStore.getState().setViewState(vs);
    },
    onClick: handleGlobeClick,
    getTooltip: getTooltipInfo,
  } as any);
  currentDeck = deck as any;
  return () => { currentDeck = null; deck.finalize(); };
}

const HAZARD_LAYER_IDS = new Set(['earthquakes', 'cyclones', 'volcanoes']);

function isLayerVisible(id: string): boolean {
  const filters = useStore.getState().filters;
  switch (id) {
    case 'earthquakes': return filters.earthquakes;
    case 'cyclones': return filters.cyclones;
    case 'volcanoes': return filters.volcanoes;
    case 'heatmap': return filters.heatmap;
    case 'graticule': return filters.graticule;
    case 'plates': return filters.plates;
    default: return true;
  }
}

function cellFillColor(d: any): [number, number, number, number] {
  if (d.color && Array.isArray(d.color) && d.color.length >= 3) {
    return [d.color[0], d.color[1], d.color[2], 70];
  }
  const s = d.risk_score || 0;
  return [Math.round(s * 255), Math.round((1 - s) * 255), 50, 70];
}

export function updateGlobeLayers(
  baseLayers: LayerConfig[],
  projectedLayers: LayerConfig[],
  minRiskScore: number,
  _basemap?: string
) {
  if (!currentDeck) return;

  const filters = useStore.getState().filters;
  const selectedCellId = useStore.getState().ui.selectedCell?.cell_id;

  // Use projected H3 data if available, otherwise base H3 data
  const h3LayerConfig = projectedLayers.length > 0
    ? projectedLayers.find((l) => l.id === 'h3-projected' || l.id === 'h3')
    : baseLayers.find((l) => l.id === 'h3');

  const h3Data = (h3LayerConfig?.data || []).filter((d: any) => (d.risk_score || 0) >= minRiskScore);
  lastH3Data = h3Data as RiskCell[];

  const hotspotData = baseLayers.find((l) => l.id === 'hotspots')?.data || [];

  const CARTO_KEY = 'cb1_2qa8_1_a275e8c9b45d6b70d3b144df';
  const BASEMAP_URLS: Record<string, string> = {
    dark: `https://basemaps.carto.com/dark_all/{z}/{x}/{y}@2x.png?api_key=${CARTO_KEY}`,
    light: `https://basemaps.carto.com/rastertiles/voyager/{z}/{x}/{y}@2x.png?api_key=${CARTO_KEY}`,
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  };

  const deckLayers: any[] = [
    new TileLayer({
      id: 'basemap',
      data: BASEMAP_URLS[useStore.getState().basemap] || BASEMAP_URLS.light,
      maxZoom: 8,
      minZoom: 0,
      tileSize: 256,
      renderSubLayers: (props: any) => {
        const { bbox: { west, south, east, north } } = props.tile;
        return new BitmapLayer(props, {
          data: undefined,
          image: props.data,
          bounds: [west, south, east, north],
        });
      },
    }),
  ];

  const HIGHLIGHT: [number, number, number, number] = [255, 215, 0, 220];

  if (h3Data.length > 0 && filters.hexagons) {
    deckLayers.push(
      new H3HexagonLayer({
        id: 'h3',
        data: h3Data,
        extruded: false,
        getHexagon: (d: any) => d.hexagon || d.cell_id || d.h3_index,
        getFillColor: (d: any) => {
          if (selectedCellId && (d.cell_id === selectedCellId || d.hexagon === selectedCellId || d.h3_index === selectedCellId)) {
            return HIGHLIGHT;
          }
          return cellFillColor(d);
        },
        getElevation: 0,
        opacity: 0.18,
        pickable: true,
        autoHighlight: true,
        highlightColor: HIGHLIGHT,
      })
    );

    // Highlight ring around selected cell
    if (selectedCellId) {
      const selected = h3Data.find((d: any) => d.cell_id === selectedCellId || d.hexagon === selectedCellId || d.h3_index === selectedCellId);
      if (selected) {
        deckLayers.push(
          new ScatterplotLayer({
            id: 'selected-ring',
            data: [selected],
            getPosition: (d: any) => [d.lon, d.lat],
            getRadius: 60000,
            getFillColor: [0, 0, 0, 0],
            getLineColor: [255, 215, 0, 255],
            getLineWidth: 3,
            radiusMinPixels: 12,
            radiusMaxPixels: 24,
            stroked: true,
            filled: false,
            pickable: false,
          })
        );
      }
    }
  }

  if (hotspotData.length > 0) {
    deckLayers.push(
      new ScatterplotLayer({
        id: 'hotspots',
        data: hotspotData,
        getPosition: (d: any) => d.position || [d.lon, d.lat],
        getRadius: 50000,
        getFillColor: [255, 80, 80, 200],
        radiusMinPixels: 4,
        radiusMaxPixels: 20,
        pickable: true,
      })
    );
  }

  // Render base layers (hazards, heatmap, graticule, plates, etc.)
  for (const cfg of baseLayers) {
    if (cfg.id === 'h3' || cfg.id === 'hotspots') continue;
    if (HAZARD_LAYER_IDS.has(cfg.id) && !isLayerVisible(cfg.id)) continue;
    if (cfg.id === 'heatmap' && !isLayerVisible('heatmap')) continue;
    if (cfg.id === 'graticule' && !isLayerVisible('graticule')) continue;
    if (cfg.id === 'plates' && !isLayerVisible('plates')) continue;
    const l = buildLayer(cfg);
    if (l) deckLayers.push(l);
  }

  // Active Alerts overlay
  const alerts = useStore.getState().alerts;
  if (alerts.length > 0) {
    const SEVERITY_COLORS: Record<string, [number, number, number, number]> = {
      info: [59, 130, 246, 180],
      watch: [234, 179, 8, 200],
      warning: [249, 115, 22, 200],
      critical: [239, 68, 68, 220],
    };
    const SEVERITY_RADIUS: Record<string, number> = {
      info: 20000,
      watch: 40000,
      warning: 60000,
      critical: 80000,
    };

    deckLayers.push(
      new ScatterplotLayer({
        id: 'active-alerts',
        data: alerts,
        getPosition: (d: any) => [d.lon, d.lat],
        getRadius: (d: any) => SEVERITY_RADIUS[d.severity] || 40000,
        getFillColor: (d: any) => SEVERITY_COLORS[d.severity] || [150, 150, 150, 180],
        getLineColor: [255, 255, 255, 200],
        getLineWidth: 1,
        radiusMinPixels: 6,
        radiusMaxPixels: 40,
        stroked: true,
        filled: true,
        pickable: true,
        opacity: 0.9,
      })
    );
  }

  currentDeck.setProps({ layers: deckLayers });
}

function accessor(value: unknown): any {
  if (typeof value === 'function') return value;
  if (typeof value === 'string') return (d: any) => d[value];
  if (typeof value === 'number') return () => value;
  if (Array.isArray(value)) return () => value;
  return value;
}

function buildLayer(cfg: LayerConfig) {
  const { id, type, props, data } = cfg;
  const common: Record<string, any> = { id, data, pickable: true };

  for (const k of Object.keys(props)) {
    if (k.startsWith('get')) common[k] = accessor(props[k]);
    else common[k] = props[k];
  }

  switch (type) {
    case 'H3HexagonLayer': return new H3HexagonLayer(common);
    case 'ScatterplotLayer': return new ScatterplotLayer(common);
    case 'PathLayer': return new PathLayer(common);
    case 'TextLayer': return new TextLayer(common);
    case 'HeatmapLayer': return new HeatmapLayer({
      ...common,
      aggregation: 'MEAN',
      radiusPixels: 20,
      intensity: 0.8,
      threshold: 0.05,
      opacity: 0.35,
    });
    default:
      return new ScatterplotLayer({
        ...common,
        getPosition: (d: any) => [d.lon, d.lat],
      });
  }
}
